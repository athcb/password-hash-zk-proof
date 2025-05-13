# zk-SNARK Proof Implementation Guide

The following is meant to serve as an example on how to generate and verify a zk-SNARK proof on- and off-chain.

It includes all the needed steps in order to:
- create the circom circuit 
- use the Groth16 protocol and the bn128 elliptic curve for the trusted setup (Powers of Tau)
- generate the proving and verification keys
- generate the witness based on the given inputs
- generate the proof 
- verify the proof (on chain and off chain)


Versions: circom 2.2.2, snarkjs 0.7.5

# Zero-Knowledge Proof: Password Hash 

Goal: Prove knowledge of a password that results in a given (public) hash without revealing the password itself.

## 1. Create the circuit in circom

Formulate the input, output variables as well as the needed contraints for the password hash proof circuit.

password.circom file:

```
pragma circom 2.2.2;


include "circomlib/circuits/poseidon.circom";


/**
 * @title PasswordHash
 * @notice Proves knowledge of a password such that the Poseidon hash of (password + salt) equals a publicly known hash.
 * @dev Uses circomlib's Poseidon hash function. The password remains private while the hash value and the salt are public.
 */
template PasswordHash {
    
    /**
     * @notice Public inputs: hash value of a salted password and its salt value.
     * @dev the salt value could also be stored privately. 
     */
    signal input publicHash;
    signal input salt;

    /**
     * @notice Private (secret) password the prover wants to prove knowledge of.
     * @dev Not revealed during the entire circuit.
     */
    signal input password;

    /**
     * @notice Intermediate value computed by the circuit.
     * @dev Internal value, not publicly exposed.
    */
    signal salted;
    salted <== password + salt;

    /**
     * @notice Computed Poseidon hash of the salted password.
     * @dev Constraint: has to match the public hash. 
    */
    signal computedHash;
    computedHash <== Poseidon(1)([salted]);
    publicHash === computedHash;
}

/**
 * @notice An instance of the PasswordHash circuit.
 * @dev Public signals should be declared below otherwise they will be treated as private.
*/
component main {public [publicHash, salt]} = PasswordHash();
```

## 2. Compile the circuit 
The compilation converts the circom file to low-level components needed to generate and verify proofs:
- --r1cs generates the Rank 1 Constraint System file: it defines all the arithmetic constraints that must be satisfied by the witness. It contains the wires, gates and aithmetic logic.
- --wasm generates the WebAssembly module that generates witnesses from input: this code will run to compute the internal signals given the input
- --sym generates a symbols file for debugging
- -o build: saves all outputs in the build folder


```
circom password.circom --r1cs --wasm --sym -o build
```

The compilation will produce a terminal output like the following: 
```
template instances: 71
non-linear constraints: 216
linear constraints: 200
public inputs: 2
private inputs: 1
public outputs: 0
wires: 419
labels: 586
```

## 3. Create Groth16 Trusted Setup 
The trusted setup prepares the cryptographic material needed to generate and verify zk-SNARK proofs using the Groth16 protocol.


## Phase 1 (circuit-agnostic)
### Generate a universal Structured Reference String (Powers of Tau)
The Powers of Tau is a public cerenomy independent of the specific circuit. 
- it specifies the elliptic curve used "bn128" 
- the maximum number of constraints 2**12
- creates an output file with the initial powers of tau
```
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
```

In order to make the Powers of Tau trusted, multiple people can contribute randomness so that no one person controls the setup: 
- every time someone contributes entropy a new powers of tau file (.ptau) is created. 
- the final .ptau file is the trusted setup for the specific circuit.
```
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
```

For a second contribution of randomness:
```
snarkjs powersoftau contribute pot12_0001.ptau pot12_0002.ptau --name="Second contribution" -v
```

and so on.

## Phase 2 (circuit-specific)
In phase 2 of the Powers of Tau the final .ptau file is generated:
- it takes the universal setup with the randomness contributions from phase 1 and transforms it based on the constraints of the r1cs file to make it suitable for Groth16 

```
snarkjs powersoftau prepare phase2 pot12_0002.ptau pot12_final.ptau -v

```

## 4. Generate zk-SNARK proving and verification keys

Generate the circuit-specific proving key (zKey):
- specify which is the final .ptau file from phase 2 that should be used (circuit specific trusted setup)
- apply the powers of tau file to the r1cs contraints of the compiled circuit
```
snarkjs groth16 setup build/password.r1cs pot12_final.ptau build/password_0000.zkey
```

Secure the proving key with another round of randomness:
- the final zKey can be used to generate proofs
```
snarkjs zkey contribute build/password_0000.zkey build/password_final.zkey --name="Key Contributor"
```

Export the verification key: 
- the verification key can be used on-chain or off-chain to verify proofs
- it does not contain "secrets" - only elliptic curve points and metadata
```
snarkjs zkey export verificationkey build/password_final.zkey build/verification_key.json
```

# Example: Off-Chain Proof Verification 

### 1. Prepare an input.json file
Prepare an input file that contains values for all private and public signals defined in the circom circuit. 

In our case the signals consist of
- the publicly known hash of the salted password
- the public salt
- the secret password 
```
{
  "publicHash": "6226004560057041027713920742662631397632345936432007178424370840963845204014",
  "salt": "1",
  "password": "12345"
}
```
The input.json file is never shared (stays on the prover's side). Only public.json is shared, which contains the public signals. The verifier then uses:
- public.json
- proof.json (does not reveal secret values)

The input file was generated with inputs/generateInput.js:

```
import { buildPoseidon } from "circomlibjs";
import { writeFileSync } from "fs";

const poseidon = await buildPoseidon();

const password = BigInt(12345);
const salt = BigInt(1);
const salted = password + salt;
const hash = poseidon([salted]);
const publicHash = poseidon.F.toString(hash);

console.log("Poseidon hash: ", publicHash);

const input = {
    publicHash: publicHash, 
    salt: salt.toString(), 
    password: password.toString()
}

writeFileSync("inputs/input.json", JSON.stringify(input, null, 2));
console.log("Created input.json file");
```

### 2. Generate the witness

Generate the witness with the wtns command
- creates an output file .wtns which is then used to generate the proof
- the witness is a complete solution to the circuit. It includes all private, public and intermediate values  from internal wires in the circuit
- the witness has all the signal values that satisfy the constraints of the r1cs file
```
snarkjs wtns calculate build/password_js/password.wasm inputs/input.json build/witness.wtns
```

Transform the .wtns file into a .json file to inspect its contents: 
```
snarkjs wtns export json build/witness.wtns build/witness.json
``` 
The witness.json file produces output with the following fields:

```
 // reserved value for signal[0]
 "1", 
 // computed hash
 "6226004560057041027713920742662631397632345936432007178424370840963845204014",
 // salt
 "1",
 // password
 "12345",
 // salt + password
 "12346",
 // internal values from running the Poseidon subcircuit
 ......
```


### 3. Generate the proof

Use the witness and the final .zkey (output of groth16 setup after all the contributions) to generate the proof without revealing the secret value:
- generates the proof.json file: stores the resulting proof
- generates the public.json file: stores the public inputs
- uses the groth16 prove command to create a proof that satisfies the circuits constraints

```
snarkjs groth16 prove build/password_final.zkey build/witness.wtns build/proof.json build/public.json
```

### 4. Verify the proof

Verify the proof using the verification key, the public inputs and the proof.
- uses the groth16 verify command
- outputs a console log message with the result of the verification (valid / invalid proof)

```
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json
```
If successfull: 

```
[INFO]  snarkJS: OK!
```

To verify the proof programmatically with snarkjs.verify(): 

```
const snarkjs = require("snarkjs");
const vKey = require("./verification_key.json");
const publicSignals = [...];
const proof = {...};

const result = await snarkjs.groth16.verify(vKey, publicSignals, proof);
console.log(result); // true or false

```

# Example: On-Chain Proof Verification 

To verify a proof on-chain we need to:
1. Generate the Verifier.sol contract 
2. Deploy the Verifier contract
3. Generate the calldata 
4. Interact with the Verifier contract

Hardhat or Foundry can be used for the contract deployment. This project uses Hardhat. 

### 1. Generate the Verifier.sol contract

Use the final proving key (zKey) to generate the verifier contract:
- after the verifier contract is deployed, its verifyProof(..) method can be called from other contracts

```
snarkjs zkey export solidityverifier build/password_final.zkey contracts/Verifier.sol
```

### 2. Deploy the Verifier contract

To compile and deploy the verifier contract (scripts/deployVerifier.js):

```
const { ethers } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Deployer's address: ", await deployer.getAddress());

    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    console.log("Verifier contract deployed to address: ", verifier.target);
}

main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);
    })
```
### 3. Generate the calldata

To generate the calldata for the .verifyProof method in the Verifier contract:

```
 snarkjs zkesc build/public.json build/proof.json
```

or within a js script:

```
const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
```
where proof and publicSignals are the parsed data from proof.json and public.json.

### 4. Interact with the Verifier contract

Interact with the deployed verifier contract by passing the calldata within the .verifyProof method (scripts/verifyProof.js):

```
...
const isValidProof = await verifier.verifyProof(
        // point (x, y) on the elliptic curve
        piA,
        // two pairs of elliptic curve points
        piB,
        // point (x, y) on the elliptic curve
        piC,
        pubSignalsInput
    );
...
```


# Complete zk-SNARK Workflow

The whole workflow including
- Circuit compilation 
- Groth16 trusted setup
- Proving and verification key generation
- Input values creation (example / dummy values)
- Witness generation
- Proof generation
- Proof verification (off-chain)
can be run with the executable bash script runZkSnarkWorkflow.sh:

```#!/bin/bash

echo "Compiling the circuit..."
circom password.circom --r1cs --wasm --sym -o build

echo "Phase 1 of Groth16 trusted setup..."
echo "Creating the universal Structured Reference String..."
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v

echo "Adding randomness (entropy) contributions..."
echo "First contribution..."
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

echo "Second contribution..."
snarkjs powersoftau contribute pot12_0001.ptau pot12_0002.ptau --name="Second contribution" -v

echo "Phase 2 of Groth16 trusted setup..."
echo "Transforming the universal setup based on the constraints of our circuit..."
snarkjs powersoftau prepare phase2 pot12_0002.ptau pot12_final.ptau -v

echo "Generating the circuit-specific proving key (zKey)..."
snarkjs groth16 setup build/password.r1cs pot12_final.ptau build/password_0000.zkey

echo "Adding another round of entropy to the key..."
snarkjs zkey contribute build/password_0000.zkey build/password_final.zkey --name="Key Contributor"

echo "Exporting the verification key..."
snarkjs zkey export verificationkey build/password_final.zkey build/verification_key.json

echo "Exporting the Verifier.sol contract..."
snarkjs zkey export solidityverifier build/password_final.zkey contracts/Verifier.sol

echo "Creating the input.json file with example values that should generate a valid proof..."
node inputs/generateInput.js

echo "Generating the witness based on the input values..."
snarkjs wtns calculate build/password_js/password.wasm inputs/input.json build/witness.wtns

echo "Exporting the witness .wtns file to .json..."
snarkjs wtns export json build/witness.wtns build/witness.json

echo "Generating the proof..."
snarkjs groth16 prove build/password_final.zkey build/witness.wtns build/proof.json build/public.json

echo "Generating the Solidity calldata for on-chain verification (if needed)..."
snarkjs zkesc build/public.json build/proof.json

echo "Verifying the proof off-chain..."
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

```

Run whole workflow with
```
./runZkSnarkWorkflow.sh
```










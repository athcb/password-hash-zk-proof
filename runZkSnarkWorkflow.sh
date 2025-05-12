#!/bin/bash

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

echo "Creating the input.json file with example values that should generate a valid proof..."
node inputs/generateInput.js

echo "Generating the witness based on the input values..."
snarkjs wtns calculate build/password_js/password.wasm inputs/input.json build/witness.wtns

echo "Exporting the witness .wtns file to .json..."
snarkjs wtns export json build/witness.wtns build/witness.json

echo "Generating the proof..."
snarkjs groth16 prove build/password_final.zkey build/witness.wtns build/proof.json build/public.json

echo "Verifying the proof off-chain..."
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const fs = require("fs");


async function main() {

    const verifierAddress = process.env.VERIFIER_ADDRESS_SEPOLIA;
    //const verifierAddress = process.env.VERIFIER_ADDRESS_LOCALHOST;
    console.log("Verifier contract address: ", verifierAddress);

    const verifier = await ethers.getContractAt("Groth16Verifier", verifierAddress);
    console.log(await verifier.interface.fragments); 

    const proof = JSON.parse(fs.readFileSync("build/proof.json"));
    const publicSignals = JSON.parse(fs.readFileSync("build/public.json"));

    // generate the calldata:
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    console.log("calldata for verifyProof method: ", calldata);
    
    // parse the raw calldata:
    const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(',')
        .map(x => x.trim());
            
    console.log("argv", argv);
    
    const piA = [argv[0], argv[1]];
    const piB = [
        [argv[2], argv[3]],
        [argv[4], argv[5]]
    ];
    const piC = [argv[6], argv[7]];
    const pubSignalsInput = argv.slice(8);
    
    console.log("piA: ", piA);
    console.log("piB: ", piB);
    console.log("piC: ", piC);
    console.log("pubSignalsInput: ", pubSignalsInput)

    // call the verifyProof method:
    const isValidProof = await verifier.verifyProof(
        // point (x, y) on the elliptic curve
        piA,
        // two pairs of elliptic curve points
        piB,
        // point (x, y) on the elliptic curve
        piC,
        pubSignalsInput
    );

    console.log("The proof is valid: ", isValidProof);
}

main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);
    })
const { ethers } = require("hardhat");
const fs = require("fs");


async function main() {

    const verifierAddress = process.env.VERIFIER_TEST_ADDRESS;
    console.log("Verifier contract address: ", verifierAddress);

    const verifier = await ethers.getContractAt("Groth16Verifier", verifierAddress);
    console.log(await verifier.interface.fragments); 

    const proof = JSON.parse(fs.readFileSync("build/proof.json"));
    let publicSignals = JSON.parse(fs.readFileSync("build/public.json"));

    let pi_a = proof.pi_a.slice(0,2);
    let pi_c = proof.pi_c.slice(0,2);
    let pi_b = [
        [proof.pi_b[0][0], proof.pi_b[0][1]],
        [proof.pi_b[1][0], proof.pi_b[1][1]]
    ];
    


    console.log("pi_a", pi_a);
    console.log("pi_b", pi_b);
    console.log("pi_c", pi_c);
    console.log("publicSignals: ", publicSignals);

    // convert inputs to BigInts
    const toBigInts = (arr) => arr.map(x => BigInt(x));
    const toBigInts2D = (arr) => arr.map(inner => toBigInts(inner));

    pi_a = toBigInts(pi_a);
    pi_b = toBigInts2D(pi_b);
    pi_c = toBigInts(pi_c);
    publicSignals = toBigInts(publicSignals);

    // check that the resulting inputs are BigInt
    console.log("pi_a", pi_a);
    console.log("pi_b", pi_b);
    console.log("pi_c", pi_c);
    console.log("publicSignals: ", publicSignals);

    // call the verifyProof method:
    const isValidProof = await verifier.verifyProof(
        // point (x, y) on the elliptic curve
        pi_a,
        // two pairs of elliptic curve points
        pi_b,
        // point (x, y) on the elliptic curve
        pi_c,
        publicSignals, 
        { gasLimit: 12_000_000 }
    );

    console.log("The proof is valid: ", isValidProof);
}

main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);
    })
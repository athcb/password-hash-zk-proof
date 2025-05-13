/**
 * @title Verifier test script
 * @notice Verifies a proof by interacting with the deployed verifier contract.
 * @dev Calls the verifyProof method with the generated calldata
 */

const { ethers, defaultAbiCoder, network } = require("hardhat");
const snarkjs = require("snarkjs");
const { expect } = require("chai");
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const fs = require("fs");

describe("Testing that the Verifier:", function() {

    async function deployVerifier() {

        // deploy the verifier
        const [deployer] = await ethers.getSigners();
        const Verifier = await ethers.getContractFactory("Groth16Verifier");
        const verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
        //console.log("Verifier deployed to address: ", verifier.target);

        // parse the proof.json and public.json files
        const proof = JSON.parse(fs.readFileSync("build/proof.json"));
        const publicSignals = JSON.parse(fs.readFileSync("build/public.json"));

        // generate the calldata:
        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        //console.log("calldata for verifyProof method: ", calldata);

        // parse the raw calldata:
        const argv = calldata
            .replace(/["[\]\s]/g, "")
            .split(',')
            .map(x => x.trim());

        // prepare the parameters for the verifyProof method
        const piA = [argv[0], argv[1]];
        const piB = [
            [argv[2], argv[3]],
            [argv[4], argv[5]]
        ];
        const piC = [argv[6], argv[7]];
        const pubSignalsInput = argv.slice(8);

        // check that the parameters have the correct format: uint[2], uint[2][2], uint[2], uint[2] 
        //console.log("piA: ", piA);
        //console.log("piB: ", piB);
        //console.log("piC: ", piC);
        //console.log("pubSignalsInput: ", pubSignalsInput)

        return { verifier, piA, piB, piC, pubSignalsInput };
    }

    it(`accepts a correct proof`, async function () {

        const { verifier, piA, piB, piC, pubSignalsInput }  = await loadFixture(deployVerifier);
   
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
        
        expect(isValidProof).to.equal(true);

    });

    it(`rejects a false proof`, async function () {

        const { verifier, piB, piC, pubSignalsInput }  = await loadFixture(deployVerifier);

        // use a wrong piA (changed last digit):
        const piA =   [
            '0x031b4e89ab62079562afae87d880b45c0c4192150bba3b3ba807701b0f7f9679',
            '0x18fe53564cea85509d38b59a617a3495701cc42276070eb5de2d692aa9623e06'
          ]
   
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
        
        expect(isValidProof).to.equal(false);

    });


})

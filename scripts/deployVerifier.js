/**
 * @title Verifier deployment
 * @notice Deploys the "Groth16Verifier" from Verifier.sol
 */
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
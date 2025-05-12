require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
      sepolia: {
        url: process.env.ALCHEMY_TESTNET_URL,
        accounts: [process.env.TEST_PRIVATE_KEY]
      },
      localhost: {
        url: "http://127.0.0.1:8545", // Local Hardhat node URL
        gas: 12000000, // higher block gas limit
        blockGasLimit: 12000000
      }
    }
};

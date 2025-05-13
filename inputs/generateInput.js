/**
 * @title Input generator script  
 * @notice Generates the input.json file with values for the circuit's signals.
 * @dev 
 */
import { buildPoseidon } from "circomlibjs";
import { writeFileSync } from "fs";

const poseidon = await buildPoseidon();

// select a value for the secret password
const password = BigInt(123456);

// select a value for the public salt
const salt = BigInt(1);

// compute the salted password
const salted = password + salt;

// compute the poseidon hash of the salted password
const hash = poseidon([salted]);
const publicHash = poseidon.F.toString(hash);

console.log("Poseidon hash: ", publicHash);

// create input.json file with the circuit's signals
const input = {
    publicHash: publicHash, 
    salt: salt.toString(), 
    password: password.toString()
}

writeFileSync("inputs/input.json", JSON.stringify(input, null, 2));
console.log("Created input.json file");

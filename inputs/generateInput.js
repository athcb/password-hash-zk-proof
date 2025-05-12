import { buildPoseidon } from "circomlibjs";
import { writeFileSync } from "fs";

const poseidon = await buildPoseidon();

const password = 12345n;
const salt = 1n;
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

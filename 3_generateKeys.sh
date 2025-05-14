#!/bin/bash

echo "Generating the circuit-specific proving key (zKey)..."
snarkjs groth16 setup build/password.r1cs pot12_final.ptau build/password_0000.zkey

echo "Adding another round of entropy to the key..."
snarkjs zkey contribute build/password_0000.zkey build/password_final.zkey --name="Key Contributor"

echo "Exporting the verification key..."
snarkjs zkey export verificationkey build/password_final.zkey build/verification_key.json

echo "-----------------"
echo "- Step 3...Done -"
echo "-----------------"
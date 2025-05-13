#!/bin/bash

echo "--------------------------------"
echo "Verifying the proof off-chain..."
echo "--------------------------------"
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

echo "--------------------------------"
echo "Verifying the proof on-chain..."
echo "--------------------------------"
npx hardhat run scripts/verifyProof.js --network sepolia

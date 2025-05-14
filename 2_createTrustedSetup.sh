#!/bin/bash

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

echo "-----------------"
echo "- Step 2...Done -"
echo "-----------------"

#!/bin/bash

echo "Compiling the circuit..."
circom password.circom --r1cs --wasm --sym -o build

echo "-----------------"
echo "- Step 1...Done -"
echo "-----------------"
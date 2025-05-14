#!/bin/bash

echo "Generating the witness based on the input values..."
snarkjs wtns calculate build/password_js/password.wasm inputs/input.json build/witness.wtns

echo "-----------------"
echo "- Step 5...Done -"
echo "-----------------"

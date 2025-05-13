#!/bin/bash

echo "Generating the witness based on the input values..."
snarkjs wtns calculate build/password_js/password.wasm inputs/input.json build/witness.wtns

echo "Exporting the witness .wtns file to .json..."
snarkjs wtns export json build/witness.wtns build/witness.json
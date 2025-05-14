#!/bin/bash

echo "Generating the proof..."
snarkjs groth16 prove build/password_final.zkey build/witness.wtns build/proof.json build/public.json

echo "-----------------"
echo "- Step 7...Done -"
echo "-----------------"

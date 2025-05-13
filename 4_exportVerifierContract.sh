#!/bin/bash

echo "Exporting the Verifier.sol contract..."
snarkjs zkey export solidityverifier build/password_final.zkey contracts/Verifier.sol

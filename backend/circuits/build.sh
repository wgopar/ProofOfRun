#!/bin/bash

: '
Executes commands to compile the Circom circuit for Merkle tree verification.
'

###### compile circuit
circom ./circuits/verifier.circom --r1cs --wasm -o ./circuits -l node_modules/circomlib/circuits

##### generate witness
# Prepare input for witness generation
jq 'to_entries 
    | .[0]
    |  {
          leaf: .key,
          pathElements: .value.pathElements,
          pathIndex: .value.pathIndex,
          root: .value.root 
        }' ./data/output/proofs.json > ./circuits/test_input.json

# store root in single json key-value pair for easy import in hardhat
jq 'to_entries 
    | .[0]
    | {
        value: .value.root
      }' ./data/output/proofs.json > ./circuits/merkleRoot.json


node ./circuits/verifier_js/generate_witness.js ./circuits/verifier_js/verifier.wasm ./circuits/test_input.json ./circuits/witness.wtns

##### Powers of Tau Ceremony
snarkjs powersoftau new bn128 15 ./circuits/pot15_0000.ptau -v

##### Contribute to the Ceremony
RANDOM_STRING=$(openssl rand -hex 16) 
snarkjs powersoftau contribute ./circuits/pot15_0000.ptau ./circuits/pot15_0001.ptau -v --name="First contribution" -e="$RANDOM_STRING"

##### Prepare for Phase 2
snarkjs powersoftau prepare phase2 ./circuits/pot15_0001.ptau ./circuits/pot15_final.ptau -v

##### Generate ZKey
snarkjs groth16 setup ./circuits/verifier.r1cs ./circuits/pot15_final.ptau ./circuits/verifier_0000.zkey

##### Contribute to Phase 2
RANDOM_STRING=$(openssl rand -hex 16)
snarkjs zkey contribute ./circuits/verifier_0000.zkey ./circuits/verifier_0001.zkey --name="1st Contributor Name" -v -e="$RANDOM_STRING"

##### Export Verification Key
snarkjs zkey export verificationkey ./circuits/verifier_0001.zkey ./circuits/verification_key.json

##### Generate Proof
snarkjs groth16 prove ./circuits/verifier_0001.zkey ./circuits/witness.wtns ./circuits/proof.json ./circuits/public.json

##### Verify Proof
snarkjs groth16 verify ./circuits/verification_key.json ./circuits/public.json ./circuits/proof.json

##### Copy Zkey, WASM, wintess_calculator.js to frontend
cp ./circuits/verifier_0001.zkey ../frontend/public/verifier.zkey
cp ./circuits/verifier_js/verifier.wasm ../frontend/public/verifier.wasm
cp ./circuits/verifier_js/witness_calculator.js ../frontend/src/zk/witness_calculator.js

##### Generate Solidity Verifier
## @NOTE: Generated Solidty Contract is modified to work correctly with our application (in inherited contract)
snarkjs zkey export solidityverifier ./circuits/verifier_0001.zkey ../hardhat/contracts/Groth16Verifier.sol
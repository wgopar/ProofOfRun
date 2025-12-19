#!/bin/bash

# after running `npx hardhat node`, this script deploys the verifier contract using ignition
# and saves the contract address and ABI to backend/src/VerifySanFranciscoMarathon.json
# file is used in backend/src/contractHelper.ts to interact with the contract
# Usage: ./deploy.sh 
# Make sure to have hardhat node running in another terminal


set -e  # stop on error
set -u  # treat unset vars as error

# --- CONFIG ---
MODULE_PATH="ignition/modules/VerifySanFranciscoMarathon.js"
NETWORK=${1:-localhost}  # default to localhost
BACKEND_PATH="../backend/src/VerifySanFranciscoMarathon.json"
CONTRACT_NAME="VerifySanFranciscoMarathon"
ARTIFACT_PATH="./artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json"

echo "Deploying ${CONTRACT_NAME} via Ignition on ${NETWORK}..."

# Run the deployment
DEPLOY_OUTPUT=$(npx hardhat ignition deploy $MODULE_PATH --network $NETWORK)
mkdir -p "scripts/output"
echo "$DEPLOY_OUTPUT" > ./scripts/output/deploy_output.txt

# Extract the contract address using jq
ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -Eo '0x[a-fA-F0-9]{40}' | tail -n 1)
echo "✅ Contract deployed at: $ADDRESS"

# Extract the ABI from the artifacts
ABI=$(jq '.abi' "$ARTIFACT_PATH")
echo "$ABI" > ./scripts/output/abi.json

# Combine into one JSON file for the backend
cat <<EOF > $BACKEND_PATH
{
  "address": "$ADDRESS",
  "abi": $ABI,
  "network": "$NETWORK",
  "updatedAt": "$(date -Iseconds)"
}
EOF

echo "💾 ABI and address saved to $BACKEND_PATH"
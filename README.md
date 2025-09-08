# ProofOfRun

```
ProofOfRun/
│
├── backend/                  # Node scripts + precomputed data
│   ├── data/                 
│   │   ├── raw/              # raw scraped JSON
│   │   ├── processed/        # cleaned JSON
│   │   └── proofs/           # tree_with_proofs.json
│   ├── scripts/              
│   │   ├── buildTree.ts      # build Merkle tree
│   │   └── generateProof.ts  # optional script to generate proof for testing
│   ├── circuits/             
│   │   ├── verifier.circom   # Circom circuit
│   │   └── Verifier.sol      # Solidity verifier contract
│   ├── package.json          
│   └── tsconfig.json
│
├── frontend/                 # React app
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── VerifyForm.tsx   # input form for bib/time
│   │   ├── utils/
│   │   │   └── poseidon.ts      # Poseidon hash helper
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── hardhat/                  # Hardhat config + deployment scripts
│   ├── contracts/            
│   │   └── Verifier.sol      # can link to backend circuits
│   ├── scripts/
│   ├── hardhat.config.ts
│   └── package.json
│
└── README.md



npm run build-tree --> output merkle tree to fileo



Circom
---
Inputs
* Private inputs: poseidon(bib,time)
* Public inputs: merkle root.
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
```

`npm run scrape`


Install all project dependencies:
`pnpm install`


Data:

```
[
  {
    "bib": "#705",
    "time": "2:25:49"
  },
  {
    "bib": "#17",
    "time": "2:28:10"
  },
  {
    "bib": "#6",
    "time": "2:33:00"
  },
  {
    "bib": "#853",
    "time": "2:33:24"
  },
  {
    "bib": "#873",
    "time": "2:35:19"
  },
  {
    "bib": "#3",
    "time": "2:35:31"
  },
  {
    "bib": "#56",
    "time": "2:35:50"
  }
]
```

`npm run build-tree`

`sh ./backend/circuits/build.sh`
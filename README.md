# Proof of Run

> Privacy-preserving marathon verification using Zero-Knowledge Proofs

**Proof of Run** is a proof-of-concept system that allows runners to cryptographically prove they completed a marathon without revealing their specific performance data. Built with ZK-SNARKs, Merkle trees, and smart contracts, it demonstrates how zero-knowledge cryptography can bring privacy to traditionally public systems.

## Motivation

Traditional race results are completely public: anyone can look up a runner's bib number, finish time, splits, and other performance metrics. While transparency serves race integrity, it creates privacy concerns:

- **Performance Privacy**: Not everyone wants their finish time publicly associated with their identity
- **Credential Use Cases**: Runners may want to prove race completion for club membership, sponsorships, or social credibility without exposing exact performance
- **Selective Disclosure**: Athletes should control what they share and with whom

**The Problem**: How can a runner prove "I completed the San Francisco Marathon 2025" without revealing "I am runner #705 who finished in 2:25:49"?

**The Solution**: Zero-knowledge proofs allow cryptographic verification of race completion while keeping performance data private. The blockchain provides a decentralized, trustless verification layer that anyone can query.

## What This Proof of Concept Demonstrates

This project showcases:

1. **Privacy-Preserving Credentials**: Using ZK-SNARKs for membership proofs without revealing underlying data
2. **Merkle Tree Commitments**: How to commit to large datasets (6,500+ runners) efficiently on-chain
3. **Practical ZK Circuits**: A working Circom circuit for Merkle path verification with Poseidon hashing
4. **End-to-End ZK Pipeline**: From circuit design to proof generation to on-chain verification
5. **Real-World Data**: Built on actual San Francisco Marathon 2024 results scraped from public sources

### Key Components

- **Circom Circuit**: Verifies Merkle tree membership in zero-knowledge
- **Smart Contract**: On-chain Groth16 verifier that stores the Merkle root and verified runners
- **Backend Service**: Generates ZK proofs from precomputed Merkle paths
- **Frontend Interface**: User-friendly proof request and verification flow

### Limitations (Proof of Concept)

This is a demonstration, not a production system:

- **Trusted Setup**: Relies on race organizers to publish honest results and build the tree correctly
- **Precomputed Proofs**: All Merkle paths are generated upfront (doesn't scale to millions of users)
- **No Sybil Resistance**: Same runner can verify multiple times from different wallets
- **Static Dataset**: Tree is immutable after deployment; corrections require redeployment
- **Centralized Proof Generation**: Backend server generates proofs (could be client-side)

Despite these limitations, the core cryptographic primitives are sound and the pattern is extensible to production systems with proper infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Proof of Run System                       │
└─────────────────────────────────────────────────────────────┘

1. Setup Phase (One-time)
   ┌──────────────────┐
   │ Race Results     │ → Scrape public data
   │ (bib, time)      │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Build Merkle Tree│ → Generate Poseidon tree
   │ Compute Root     │ → Precompute all proofs
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Deploy Contract  │ → Publish root on-chain
   │ (Groth16Verifier)│
   └──────────────────┘

2. Verification Flow (Per Runner)
   ┌──────────────────┐
   │ Runner Input     │ → Enter bib + time
   │ (Frontend)       │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Fetch Merkle Path│ → Backend lookup
   │ Generate ZK Proof│ → snarkjs.groth16.prove()
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Submit to Chain  │ → verifyRunner(proof)
   │ Get On-Chain     │ → verifiedRunners[addr] = true
   │ Credential       │
   └──────────────────┘
```

## Project Structure

```
ProofOfRun/
│
├── backend/                           # Node.js backend service
│   ├── data/
│   │   ├── raw/                       # Scraped race results JSON
│   │   ├── processed/                 # Cleaned and formatted data
│   │   └── output/                    # Generated Merkle tree & proofs
│   ├── scripts/
│   │   └── buildTree.ts               # Merkle tree builder with Poseidon
│   ├── circuits/
│   │   ├── verifier.circom            # ZK circuit for Merkle verification
│   │   ├── verifier.wasm              # Compiled circuit (witness generation)
│   │   └── verifier_0001.zkey         # Proving key (Groth16)
│   ├── src/
│   │   ├── index.ts                   # Express API server
│   │   ├── zkHelper.ts                # ZK proof generation logic
│   │   └── contractHelper.ts          # Ethers.js contract interactions
│   └── package.json
│
├── frontend/                          # React verification interface
│   ├── src/
│   │   ├── components/
│   │   │   └── ProofForm.tsx          # User input form
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
│
├── hardhat/                           # Smart contract development
│   ├── contracts/
│   │   ├── VerifySanFranciscoMarathon.sol  # Main verifier contract
│   │   └── Groth16Verifier.sol        # Generated from circuit
│   ├── scripts/
│   │   └── deploy.ts                  # Deployment script
│   └── hardhat.config.ts
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm (or npm)
- Circom 2.1.9
- Hardhat

### Installation

Install dependencies across all workspaces:

```bash
pnpm install
```

### Setup & Build Process

#### 1. Build Merkle Tree

Generate the Merkle tree from processed race results:

```bash
cd backend
npm run build-tree
```

This creates `data/output/proofs.json` containing all precomputed Merkle paths.

#### 2. Compile ZK Circuit

Build the Circom circuit and generate proving/verification keys:

```bash
cd backend/circuits
sh build.sh
```

This generates:
- `verifier.wasm` - Witness calculator
- `verifier_0001.zkey` - Proving key
- `Groth16Verifier.sol` - Solidity verifier contract

#### 3. Deploy Smart Contract

Deploy the verifier contract with the Merkle root:

```bash
cd hardhat
npx hardhat run scripts/deploy.ts --network sepolia
```

Update `backend/src/VerifySanFranciscoMarathon.json` with the deployed contract address.

#### 4. Run Backend Service

Start the proof generation service:

```bash
cd backend
npm run dev
```

#### 5. Run Frontend

Launch the verification interface:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` to verify your run!

## Usage Example

### For Runners

1. Navigate to the verification interface
2. Enter your bib number and finish time
3. Click "Verify My Run"
4. Approve the transaction in your wallet
5. Receive on-chain verification credential

Your wallet address is now cryptographically linked to race completion without revealing your specific performance data.

### Checking Verification Status

Query the contract to see verified runner count:

```bash
curl http://localhost:3001/runners/verified/count
```

Or check if a specific address is verified:

```solidity
bool isVerified = contract.isVerified(0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb);
```

## Technical Deep Dive

For a detailed explanation of the cryptographic primitives, circuit design, and system architecture, see [blog-post.md](blog-post.md).

Key topics covered:
- How ZK-SNARKs enable privacy-preserving membership proofs
- Merkle tree construction with Poseidon hashing
- Circom circuit implementation
- End-to-end verification flow from user input to on-chain proof

## Data Format

Race results are stored as JSON:

```json
[
  {
    "bib": "705",
    "time": "22549"
  },
  {
    "bib": "17",
    "time": "22890"
  }
]
```

Where:
- `bib`: Runner's bib number (integer)
- `time`: Finish time in seconds (e.g., 2:25:49 → 2×3600 + 25×60 + 49 = 22549)

Each runner's leaf is computed as: `leaf = Poseidon(bib, time)`

## Gas Costs

Typical verification transaction:
- **Gas Used**: ~250,000 gas
- **Cost (at 20 gwei)**: ~0.005 ETH (~$12 at $2400 ETH)

The Groth16 verification algorithm is constant-time regardless of tree size.

## Future Improvements

### Production Readiness
- Client-side proof generation (eliminate backend trust)
- On-demand proof computation (no precomputation needed)
- Multi-race support with dynamic tree updates
- Integration with official race timing systems

### Enhanced Privacy
- Nullifier system to prevent double-claims while maintaining privacy
- Range proofs (prove "I finished under 3 hours" without exact time)
- Anonymous credentials with revocation

### Scalability
- Recursive SNARKs for batched verification
- Layer 2 deployment for lower costs
- IPFS storage for large proof datasets

## Contributing

This is a proof-of-concept for educational purposes. Contributions, ideas, and feedback are welcome!

## License

MIT

## Acknowledgments

- **San Francisco Marathon** for providing public race results (used for educational purposes)
- **Circom & snarkjs** teams for excellent ZK tooling
- **ZK community** for advancing privacy-preserving cryptography

---

**Disclaimer**: This is a proof-of-concept built for educational purposes to demonstrate zero-knowledge proof techniques. It is not affiliated with or endorsed by any official marathon organization.
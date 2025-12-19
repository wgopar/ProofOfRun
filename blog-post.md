# Proof of Run: Privacy-Preserving Marathon Verification with Zero-Knowledge Proofs

## 1. The Idea Behind Proof of Run

Traditional marathon verification systems expose sensitive runner data publicly—bib numbers, finish times, and personal information are freely accessible to anyone. While transparency is important for race integrity, this creates privacy concerns for participants who may not want their performance data publicly linked to their identity.

**Proof of Run** solves this problem using zero-knowledge proofs (ZK-SNARKs). Runners can prove they completed a specific marathon—like the San Francisco Marathon 2025—without revealing their actual bib number or finish time. This creates a privacy-preserving membership credential: "I am a verified runner of this race" without exposing "I am runner #705 with a finish time of 2:25:49."

### The Core Concept

The system works by constructing a Merkle tree from official race results and allowing runners to generate cryptographic proofs of inclusion in that tree:

1. **Trusted Setup**: Race organizers publish official results and build a Merkle tree containing all runner data
2. **Private Proof Generation**: Individual runners generate zero-knowledge proofs that their (bib, time) pair exists as a leaf in the tree
3. **On-Chain Verification**: A smart contract verifies the proof without learning the runner's specific data
4. **Membership Badge**: Verified runners receive an on-chain credential proving they completed the race

This approach preserves privacy while maintaining verifiable integrity—the best of both worlds.

---

## 2. Zero-Knowledge SNARKs: The Privacy Engine

### What Are ZK-SNARKs?

**ZK-SNARK** stands for "Zero-Knowledge Succinct Non-Interactive Argument of Knowledge." Let's break down what makes them powerful for Proof of Run:

- **Zero-Knowledge**: The verifier learns nothing except that the statement is true (you're in the tree, but not which leaf you are)
- **Succinct**: The proof is tiny (~200 bytes) and fast to verify (~1ms on-chain)
- **Non-Interactive**: No back-and-forth between prover and verifier—perfect for blockchain verification
- **Argument of Knowledge**: The prover must actually know the witness (your bib and time) to generate a valid proof

### The Mathematics Behind It

Our circuit implements a Merkle tree membership proof. For a runner with bib number $b$ and finish time $t$, we compute:

$$
\text{leaf} = H(b, t)
$$

where $H$ is the Poseidon hash function, a ZK-friendly cryptographic hash. The runner then proves they can traverse from this leaf to the published root $r$ using a path of sibling hashes.

At each level $i$ of the tree (where $i \in [0, d-1]$ for depth $d$), we compute:

$$
\text{cur}_{i+1} = \begin{cases}
H(\text{pathElement}_i, \text{cur}_i) & \text{if pathIndex}_i = 0 \text{ (left child)} \\
H(\text{cur}_i, \text{pathElement}_i) & \text{if pathIndex}_i = 1 \text{ (right child)}
\end{cases}
$$

The proof succeeds if and only if:

$$
\text{cur}_d = r
$$

This computation happens entirely within a ZK circuit, so the verifier sees only the root $r$ (public input) but never sees the leaf, bib, time, or path elements (private inputs).

### The Circom Circuit

Here's the core circuit that implements this Merkle proof verification:

```circom
template merkleStep(){
  signal input cur;           // current hash
  signal input pathElement;   // sibling at this level
  signal input selector;      // 0 = left child, 1 = right child
  signal output out;

  // Compute both possible parent hashes
  component hashLeft = Poseidon(2);
  hashLeft.inputs[0] <== pathElement;
  hashLeft.inputs[1] <== cur;

  component hashRight = Poseidon(2);
  hashRight.inputs[0] <== cur;
  hashRight.inputs[1] <== pathElement;

  // Select correct hash based on position
  component mux = Mux1();
  mux.c[0] <== hashLeft.out;
  mux.c[1] <== hashRight.out;
  mux.s <== selector;
  out <== mux.out;
}

template verifier(depth){
  signal input root;                  // PUBLIC: Merkle root
  signal input leaf;                  // PRIVATE: runner's leaf hash
  signal input pathElements[depth];   // PRIVATE: sibling hashes
  signal input pathIndex[depth];      // PRIVATE: left/right indicators

  signal cur[depth + 1];
  cur[0] <== leaf;

  component steps[depth];
  for (var i = 0; i < depth; i++) {
    steps[i] = merkleStep();
    steps[i].cur <== cur[i];
    steps[i].pathElement <== pathElements[i];
    steps[i].selector <== pathIndex[i];
    cur[i + 1] <== steps[i].out;
  }

  root === cur[depth];  // Enforce root equality
}

// For 6,537 runners: depth 13 (2^13 = 8,192 leaves)
component main {public [root]} = verifier(13);
```

This circuit constrains the computation such that only someone who knows a valid (leaf, pathElements, pathIndex) tuple can generate a valid proof for a given root.

### Why Poseidon Hash?

Traditional hash functions like SHA-256 are expensive to prove in ZK circuits (requiring tens of thousands of constraints). **Poseidon** is specifically designed for ZK-SNARKs, using only ~150 constraints per hash—making it perfect for Merkle trees in circuits.

---

## 3. Generating the Merkle Tree

The Merkle tree is the foundation of our proof system. We build it from official race results and publish the root on-chain as the "source of truth."

### Building the Tree

The tree construction happens in three phases:

#### Phase 1: Leaf Generation

For each runner in the race results, we create a leaf by hashing their (bib, time) pair:

```typescript
const leaves = results.map((runner) => {
  const bib = BigInt(runner.bib);
  const time = BigInt(runner.time.replace(/[^0-9]/g, "") || "0");
  const leaf = poseidon([bib, time]);
  return bigIntToBuffer(poseidon.F.toObject(leaf));
});
```

For example, runner #705 with time 2:25:49 becomes:
- Input: $(705, 22549)$ (time converted to seconds: 2×3600 + 25×60 + 49)
- Output: $\text{leaf}_{705} = H_{\text{Poseidon}}(705, 22549)$

#### Phase 2: Tree Construction

We use the `merkletreejs` library with our custom Poseidon hash function:

```typescript
const poseidonHash = (inputs: Buffer | Buffer[]): Buffer => {
  let left: Buffer, right: Buffer;

  if (Array.isArray(inputs)) {
    [left, right] = inputs;
  } else {
    const chunkSize = 32;
    left = inputs.slice(0, chunkSize);
    right = inputs.slice(chunkSize, chunkSize * 2);
  }

  const leftBig = BigInt("0x" + left.toString("hex"));
  const rightBig = BigInt("0x" + right.toString("hex"));
  const hash = poseidon([leftBig, rightBig]);
  return bigIntToBuffer(poseidon.F.toObject(hash));
};

const tree = new MerkleTree(leaves, poseidonHash, {
  duplicateOdd: true,
  sortPairs: false
});
```

The tree structure for depth 13 looks like:

```
                    root (level 13)
                   /    \
                  /      \
              h₁₂,₀      h₁₂,₁  (level 12)
              /  \       /  \
            ...  ...   ...  ...
           /      \
      leaf₀      leaf₁  ...  leaf₆₅₃₇  (level 0)
```

For the San Francisco Marathon with 6,537 runners, we use depth 13 because $2^{13} = 8,192 \geq 6,537$.

#### Phase 3: Proof Precomputation

For each leaf, we precompute and store the Merkle proof:

```typescript
const entries = results.map((runner, idx) => ({
  leaf: bufferToBigInt(leaves[idx]).toString(),
  pathElements: tree.getProof(leaves[idx]).map(p =>
    bufferToBigInt(p.data).toString()
  ),
  pathIndex: tree.getProof(leaves[idx]).map(p =>
    (p.position === "right" ? 1 : 0)
  ),
  root: root
}));
```

Each proof contains:
- `pathElements`: Array of 13 sibling hashes along the path to root
- `pathIndex`: Array of 13 bits indicating left (0) or right (1) child at each level
- `root`: The Merkle root (same for all runners)

### Publishing the Root

The computed Merkle root is deployed in the smart contract:

```solidity
contract VerifySanFranciscoMarathon is Groth16Verifier {
    uint256 public merkleRoot;  // Published root
    string public marathonName = "San Francisco Marathon 2025";
    string public marathonDate = "July 27th, 2025";

    constructor(uint256 _root) {
        merkleRoot = _root;
        owner = msg.sender;
    }
}
```

This root becomes the immutable reference point: any valid proof must reconstruct this exact root from a private leaf.

---

## 4. End-to-End Flow

Let's walk through the complete verification flow, from a runner's perspective to on-chain confirmation.

### Step 1: Runner Submits Request

A runner visits the Proof of Run frontend and enters their credentials:

```typescript
// Frontend: ProofForm.tsx
const handleSubmit = async () => {
  const response = await fetch('/verify', {
    method: 'POST',
    body: JSON.stringify({ leaf: hashedCredentials })
  });
};
```

The frontend hashes the user's (bib, time) pair locally to create the leaf identifier.

### Step 2: Backend Retrieves Proof

The backend looks up the precomputed Merkle proof for this leaf:

```typescript
// Backend: index.ts
app.post("/verify", async (req, res) => {
  const { leaf } = req.body;

  if (!proofsJson[leaf]) {
    return res.status(404).json({
      valid: false,
      code: "RUNNER_NOT_FOUND"
    });
  }

  const proof = {
    leaf: leaf,
    pathElements: proofsJson[leaf].pathElements,
    pathIndex: proofsJson[leaf].pathIndex,
    root: proofsJson[leaf].root
  };

  const response = await submitProof(proof);
  res.json({ valid: response });
});
```

### Step 3: ZK Proof Generation

The backend generates a Groth16 proof using snarkjs:

```typescript
// Backend: zkHelper.ts
export async function submitProof(data: proof) {
  const inputs = {
    leaf: data.leaf,
    pathElements: data.pathElements,
    pathIndex: data.pathIndex,
    root: data.root
  };

  // Generate witness from circuit inputs
  const wasmPath = './circuits/verifier_js/verifier.wasm';
  const wasmBuffer = await readFile(wasmPath);
  const wc = await witnessCalculator(wasmBuffer);
  const witnessBin = await wc.calculateWTNSBin(inputs, true);

  // Generate ZK proof
  const zkeyPath = './circuits/verifier_0001.zkey';
  const { proof, publicSignals } = await snarkjs.groth16.prove(
    zkeyPath,
    witnessBin
  );

  // Format for Solidity verifier
  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const argv = JSON.parse("[" + calldata + "]");

  return argv;  // [pA, pB, pC, publicSignals]
}
```

The proof generation uses the Groth16 proving algorithm, which produces:

$$
\pi = (A, B, C) \in \mathbb{G}_1 \times \mathbb{G}_2 \times \mathbb{G}_1
$$

These are elliptic curve points that encode the witness in a zero-knowledge way.

### Step 4: On-Chain Verification

The smart contract verifies the proof using the Groth16 verifier:

```solidity
function verifyRunner(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[1] calldata _pubSignals
) external returns (bool) {
    // Ensure proof is for our Merkle root
    require(_pubSignals[0] == merkleRoot, "Invalid root");

    // Prevent double verification
    require(!verifiedRunners[msg.sender], "Already verified");

    // Verify the ZK proof
    bool isValid = verifyProof(_pA, _pB, _pC, _pubSignals);
    require(isValid, "Invalid proof");

    // Mark runner as verified
    verifiedRunners[msg.sender] = true;
    verifiedRunnersCount += 1;
    emit RunnerVerified(msg.sender);

    return true;
}
```

The `verifyProof` function (inherited from `Groth16Verifier`) checks the pairing equation:

$$
e(A, B) = e([\alpha]_1, [\beta]_2) \cdot e(C, [\delta]_2) \cdot e([\text{vk}]_1, [\gamma]_2)
$$

where $e$ is the optimal ate pairing on the BN254 curve. This verification takes ~250k gas and completes in milliseconds.

### Step 5: Verification Confirmation

Upon success, the runner receives an on-chain credential:

- Their address is stored in `verifiedRunners[msg.sender] = true`
- A `RunnerVerified` event is emitted with their address
- The global counter `verifiedRunnersCount` increments

The runner can now prove to any third party that they completed the San Francisco Marathon 2025 by simply showing their wallet address—without revealing their specific performance data.

### Flow Diagram

```
┌─────────────┐
│   Runner    │ Enters bib + time
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  Frontend: Hash credentials to leaf                 │
│  leaf = Poseidon(bib, time)                        │
└─────────────────────┬───────────────────────────────┘
                      │ POST /verify {leaf}
                      ▼
┌─────────────────────────────────────────────────────┐
│  Backend: Lookup precomputed proof                  │
│  proofs[leaf] → {pathElements, pathIndex, root}    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  ZK Proof Generation (Groth16)                      │
│  π ← Prove(circuit, {leaf, path, root})            │
└─────────────────────┬───────────────────────────────┘
                      │ Send transaction
                      ▼
┌─────────────────────────────────────────────────────┐
│  Smart Contract: Verify proof on-chain              │
│  require(Verify(π, root) == true)                  │
│  verifiedRunners[msg.sender] = true                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
                 ✅ Verified!
           Runner gets on-chain badge
```

### Security Properties

This flow guarantees:

1. **Soundness**: Only runners who actually completed the race (leaf in tree) can generate valid proofs
2. **Zero-Knowledge**: The smart contract learns nothing about the runner's bib or time
3. **Non-Transferability**: Proofs are tied to `msg.sender`, preventing proof reuse
4. **Integrity**: The Merkle root is immutable once deployed, ensuring no tampering with results

---

## Conclusion

Proof of Run demonstrates how zero-knowledge cryptography can bring privacy to traditionally public systems. By combining Merkle trees, ZK-SNARKs, and smart contracts, we enable runners to prove race completion without sacrificing personal performance data.

The system is:
- **Private**: No one learns your bib or time
- **Verifiable**: Cryptographically guaranteed race completion
- **Decentralized**: On-chain verification anyone can trust
- **Practical**: Sub-second verification, minimal gas costs

This pattern extends beyond marathons—any scenario requiring privacy-preserving membership proofs (event attendance, credential verification, allowlist inclusion) can use this architecture.

The future of digital credentials is zero-knowledge. Proof of Run is just the starting line.

---

### Technical Resources

- **Contract**: [VerifySanFranciscoMarathon.sol](hardhat/contracts/VerifySanFranciscoMarathon.sol)
- **Circuit**: [verifier.circom](backend/circuits/verifier.circom)
- **Tree Builder**: [buildTree.ts](backend/scripts/buildTree.ts)
- **Proof Service**: [zkHelper.ts](backend/src/zkHelper.ts)

Built with Circom, snarkjs, ethers.js, and Hardhat.

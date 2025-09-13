import fs from "fs";
import { MerkleTree } from "merkletreejs";
import { buildPoseidon } from "circomlibjs";


// Convert BigInt -> fixed-length Buffer (32 bytes)
function bigIntToBuffer(x: bigint, bytes=32): Buffer {
  const hex = x.toString(16).padStart(bytes * 2, "0"); // pad to bytes*2 hex chars
  return Buffer.from(hex, "hex");
}

// Convert Buffer -> BigInt
function bufferToBigInt(buf: Buffer): bigint {
  // Ensure treating buffer as hex; prefix 0x then BigInt(...)
  return BigInt("0x" + buf.toString("hex"));
}

(async () => {

  const raw = fs.readFileSync("./data/processed/sf_marathon_athlinks_results.json", "utf-8");
  const results: any[] = JSON.parse(raw);

  const poseidon = await buildPoseidon();

  // Build Poseidon leaves (turn them into Buffers for MerkleTreeJS)
  const leaves = results.map((runner) => {
    const bib = BigInt(runner.bib);
    const time = BigInt(runner.time.replace(/[^0-9]/g, "") || "0"); // remove non-numeric characters
    const leaf = poseidon([bib, time]);
    return bigIntToBuffer(poseidon.F.toObject(leaf));
  });

  console.log("Number of leaves:", leaves.length);

// Poseidon hash for internal nodes
// takes pair of buffers [left, right] and hashes them
  const poseidonHash = (inputs: Buffer | Buffer[]): Buffer => {
  let left: Buffer, right: Buffer;

  if (Array.isArray(inputs)) {
    // case: user directly calls poseidonHashPair([leftBuf, rightBuf])
    [left, right] = inputs;
  } else {
    // case: merkletreejs calls poseidonHashPair(concatBuffer)
    const chunkSize = 32; // assuming 32-byte inputs
    left = inputs.slice(0, chunkSize);
    right = inputs.slice(chunkSize, chunkSize * 2);
  }

  const leftBig = BigInt("0x" + left.toString("hex"));
  const rightBig = BigInt("0x" + right.toString("hex"));
  const hash = poseidon([leftBig, rightBig]);
  return bigIntToBuffer(poseidon.F.toObject(hash)); // back to buffer
};

  const tree = new MerkleTree(leaves, poseidonHash, { duplicateOdd: true, sortPairs: false});
  const root = bufferToBigInt(tree.getRoot()).toString();
  console.log("Merkle Tree built with root:", root);

  // Precompute proofs for saving tree
  const entries = results.map((runner, idx) => ({
    bib: runner.bib,
    time: runner.time,
    leaf: bufferToBigInt(leaves[idx]).toString(),
    pathElements: tree.getProof(leaves[idx]).map(p => bufferToBigInt(p.data).toString()),
    pathIndex: tree.getProof(leaves[idx]).map(p => (p.position === "right" ? 1 : 0)),
  }));

  fs.writeFileSync("./data/output/proofs.json", JSON.stringify({ root, entries }, null, 2));
  console.log("Proofs saved to ./data/output/proofs.json");
  console.log("Tree depth:", tree.getDepth());

  // Debug: run through one proof manually
  const proof = tree.getProof(leaves[0]); // first runner
  let cur = bufferToBigInt(leaves[0]); // start at leaf
  console.log("Start leaf:", cur.toString());


  // debugging: compute Poseidon step
  function poseidonStep(cur: bigint, pathElement: bigint, selector: number): bigint {
    const left = poseidon([pathElement, cur]);
    const right = poseidon([cur, pathElement]);
    return selector === 0 ? poseidon.F.toObject(left) : poseidon.F.toObject(right);
  }


  proof.forEach((p, i) => {
    const pathEl = bufferToBigInt(p.data);
    const sel = p.position === "right" ? 1 : 0;
    cur = poseidonStep(cur, pathEl, sel);
    console.log(`Level ${i}: cur=${cur.toString()} (sel=${sel}, pathEl=${pathEl})`);
  });

  console.log("Final JS root from proof:", cur.toString());
  console.log("Tree root:", root);
})();
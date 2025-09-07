// src/scripts/buildTree.ts
import fs from "fs";
import { MerkleTree } from "merkletreejs";
import { buildPoseidon } from "circomlibjs";


// BigInt → Buffer
function toBuffer(x: bigint): Buffer {
  return Buffer.from(x.toString(16).padStart(64, "0"), "hex");
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
    return toBuffer(poseidon.F.toObject(leaf));
  });

  console.log("Number of leaves:", leaves.length);

// Poseidon hash for internal nodes
// takes pair of buffers [left, right] and hashes them
  const poseidonHash = (inputs: Buffer[]): Buffer => {
  const arr = Array.isArray(inputs) ? inputs : [inputs]; // normalize input
  const bigs = arr.map(i => BigInt("0x" + i.toString("hex"))); // convert buffer back to bigin
  const hash = poseidon(bigs);
  return toBuffer(poseidon.F.toObject(hash)); // back to buffer
};


  // Build Merkle Tree
  // TODO: make sure to be able to handle odd leaves in Circom Cuircuit generation
  const tree = new MerkleTree(leaves, poseidonHash, { duplicateOdd: true, sortPairs: true }); // odd nodes duplicated, pairs sorted
  const root = tree.getRoot().toString("hex");

  // Precompute proofs for saving tree
  const entries = results.map((runner, idx) => ({
    bib: runner.bib,
    time: runner.time,
    leaf: leaves[idx].toString("hex"),
    pathElements: tree.getProof(leaves[idx]).map(p => p.data.toString("hex")),
    pathIndex: tree.getProof(leaves[idx]).map(p => (p.position === "right" ? 1 : 0)),
  }));

  fs.writeFileSync("./data/output/proofs.json", JSON.stringify({ root, entries }, null, 2));
  console.log("Merkle root:", root);

  const test = tree.getLeaves();
  const depth = Math.ceil(Math.log2(test.length));
  console.log("Tree depth:", depth);
  console.log("Tree + proofs saved to tree_with_proofs.json");

})();
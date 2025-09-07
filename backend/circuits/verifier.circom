pragma circom 2.0.0;

include "circomlib/poseidon.circom";

// Merkle Tree Verifier Circuit
// Verifies that a given leaf is part of a Merkle tree with a known root
template verifier(depth){
  signal input leaf; // The leaf value to prove membership for
  signal input pathElements[depth]; // The sibling hashes along the path to the root
  signal input pathIndex[depth]; // The indices (0 or 1) indicating left/right position at each level
  signal input root; // The expected Merkle root  

  // Start at leaf
  signal = cur;
  cur <== leaf;

  for (var i = 0; i < depth; i++) {
    // Determine left and right children based on pathIndex
    signal left;
    signal right;

    left <== (1 - pathIndex[i]) * cur + pathIndex[i] * pathElements[i];
    right <== pathIndex[i] * cur + (1 - pathIndex[i]) * pathElements[i];

    // Hash the concatenated left and right children to get the parent
    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;
    cur <== hasher.out;
  }

  root == cur;
  
}

// depth = 13 for 6,537 runners (next power of 2 = 8192 = 2^13)
component main = MerkleMembership(13); 
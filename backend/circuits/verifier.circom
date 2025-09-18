pragma circom 2.1.9;

include "poseidon.circom";
include "mux1.circom"; // multiplexer component (0, 1) based on selector

template merkleStep(){
  /*
  One step in the Merkle tree path computation.
  Inputs:
    - cur: current hash (node)
    - pathElement: sibling hash at this level
    - selector: 0 if cur is left child, 1 if cur is right child
  Output:
    - out: resulting parent hash
  */
  signal input cur;
  signal input pathElement;
  signal input selector;
  signal output out;

  // assume left sibling
  component hashLeft = Poseidon(2);
  hashLeft.inputs[0] <== pathElement;
  hashLeft.inputs[1] <== cur;

  // assume right sibling
  component hashRight = Poseidon(2);
  hashRight.inputs[0] <== cur;
  hashRight.inputs[1] <== pathElement;

  // select the correct hash based on selector
  component mux = Mux1();
  mux.c[0] <== hashLeft.out;
  mux.c[1] <== hashRight.out;
  mux.s <== selector; 
  out <== mux.out; // selected hash
}

template verifier(depth){
  /*
  Verifier circuit for a Merkle tree of given depth.
  Inputs:
    - leaf: the leaf node to verify
    - pathElements: array of sibling hashes along the path to the root
    - pathIndex: array of indices (0 or 1) indicating left/right position at each level
    - root: the expected Merkle root
  Output:
    - Ensures that the computed root from the leaf and path matches the provided root.
  */
  signal input root; // only public input, rest private
  signal input leaf; 
  signal input pathElements[depth]; 
  signal input pathIndex[depth]; 

  signal cur[depth + 1]; // array of signals to hold current hash at each level
  cur[0] <== leaf; // start at leaf

  component steps[depth];
  for (var i = 0; i < depth; i++) {
    steps[i] = merkleStep();
    steps[i].cur <== cur[i];  
    steps[i].pathElement <== pathElements[i]; 
    steps[i].selector <== pathIndex[i];
    cur[i + 1] <== steps[i].out;
  }
  root === cur[depth]; // enforce equality
}

// depth = 13 for 6,537 runners (next power of 2 = 8192 = 2^13)
component main {public [root]} = verifier(13);


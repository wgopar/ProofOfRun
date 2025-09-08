: '
Executes commands to compile the Circom circuit for Merkle tree verification.

1. Build the circuit using circom compiler.
  a. Outputs the R1CS, WASM, and symbol files to the specified output directory with circomlib library included for cryptographic functions.

'

circom ./circuits/verifier.circom --r1cs --wasm -o ./circuits -l node_modules/circomlib/circuits
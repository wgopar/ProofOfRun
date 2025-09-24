import * as snarkjs from "snarkjs";
import { readFile } from 'fs/promises';
import { join } from "path";
import { fileURLToPath } from "url";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function generateProof(input: any) {

  // @ts-ignore
  const witnessCalculator = (await import('../../backend/circuits/verifier_js/witness_calculator.js')).default;
  const wasmPath = join(__dirname, '../../backend/circuits/verifier_js/verifier.wasm');
  const wasmBuffer = await readFile(wasmPath);
  const wc = await witnessCalculator(wasmBuffer, { sanityCheck: true });
  const witnessBin = await wc.calculateWTNSBin(input, true);
  
  // Generate Proof
  const zkeyPath = join(__dirname, '../../backend/circuits/verifier_0001.zkey');
  const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, witnessBin);
  
  // Format calldata for Solidity Verifier
  const calldataString = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const argv = JSON.parse("[" + calldataString + "]");
  
  return { proof, publicSignals, argv };
}
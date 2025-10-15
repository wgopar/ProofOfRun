import * as snarkjs from "snarkjs";
import path, { join } from "path";
import { readFile } from 'fs/promises';
import { fileURLToPath } from "url";
import { Buffer } from "buffer";
// @ts-ignore: untyped module
import builder from "./witness_calculator.js";
import { getVerifierContract } from './contractHelper.js';
import pino from 'pino';

export const logger = pino({
    transport: {
    target: "pino-pretty",
    options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname"
        }
    },
    level: process.env.LOG_LEVEL || "info"
    });

interface proof {
  leaf: BigInt;
  pathElements: BigInt[];
  pathIndex: BigInt[];
  root: BigInt;
  }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function submitProof(data: proof) {
    const inputs = { 
      leaf: data.leaf,
      pathElements: data.pathElements,
      pathIndex: data.pathIndex,
      root: data.root
    };

    // Generate Witness
    const wasmPath = join(__dirname, '../circuits/verifier_js/verifier.wasm');
    const wasmBuffer = await readFile(wasmPath);
    const witnessCalculator = builder;
    const wc = await witnessCalculator(wasmBuffer, { sanityCheck: true });
    const witnessBin = await wc.calculateWTNSBin(inputs, true);

    // Generate Proof
    const zkeyPath = join(__dirname, '../circuits/verifier_0001.zkey');
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, witnessBin);

    // Format calldata for Solidity Verifier
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]"); // format to proper json format

    // Verify Proof on-chain
    const verifierContract = await getVerifierContract();
    logger.info("Verifying proof on contract at: " + verifierContract.address);
    const contractResponse = await verifierContract.verifyProof(argv[0], argv[1], argv[2], argv[3]);
    logger.info("Contract response: " + contractResponse);
    return contractResponse;
}
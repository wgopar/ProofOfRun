import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import { Buffer } from "buffer";
// @ts-ignore: untyped module
import builder from "./witness_calculator.js";
import { getVerifierContract } from './contractHelper.js';

export async function submitProof(bib: number, time: string) {
  console.log("Submitting proof for Bib:", bib, "Finish Time:", time);

    // time parsing: remove trailing zeros from hour
    const parts = time.split(":");
    const hour = parts[0].replace(/^0/, "");
    const clean_time = [hour, parts[1], parts[2]].join(""); // remove colons (for generating proof)
    const inputs = { bib: bib, time: clean_time };
    console.log('Inputs for proof:', inputs);

    // convert to leaf format
    const poseidon = await buildPoseidon();
    const hash = poseidon([BigInt(bib), BigInt(clean_time)]);
    const leaf = poseidon.F.toObject(hash);
    console.log("Check if leaf exists: ", leaf.toString());

    // If leaf in pre-generated treets


    // Generate Witness
    const wasmResponse = await fetch("/verifier.wasm");
    const wasmBuffer = await wasmResponse.arrayBuffer();
    const wasm = Buffer.from(wasmBuffer);
    const wc = await builder(wasm, { sanityCheck: true }); // witness calculator
    const witnessBin = await wc.calculateWTNSBin(inputs, true); // binary format
    console.log("Calculated witness");

    // Generate Proof
    const zkey = await fetch('./verifier.zkey');
    const zkeyBuffer = await zkey.arrayBuffer();
    const zkeyFinal = new Uint8Array(zkeyBuffer);
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyFinal, witnessBin);
    console.log("proof", proof);
    console.log("publicSignals", publicSignals);

    // Format calldata for Solidity Verifier
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]"); // format to proper json format
    console.log("argv", argv);

    const _a = argv[0]; // parts of proof
    const _b = argv[1];
    const _c = argv[2];
    const _n = argv[3]; // public signals of circuit

    // Verify Proof on-chain
    const verifierContract = await getVerifierContract();
    const contractResponse = await verifierContract.verifyProof(_a, _b, _c, _n);

    // Return mock response
    return { success: true, message: "Proof submitted successfully (mock)" };
}
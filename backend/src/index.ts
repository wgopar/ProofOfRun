import express from "express";
import dotenv from "dotenv";
import pino from "pino";
import { JsonRpcProvider } from "@ethersproject/providers";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { readFile } from 'fs/promises';
import { submitProof } from "./zkHelper.js"; 
import { getVerifierContract } from "./contractHelper.js";
import { getVerifiedRunnersCount } from "./contractHelper.js";
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173", //  React dev server
  methods: ["GET", "POST"],
  credentials: true
}));
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.originalUrl }, "Incoming request");
  next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Load pre-computed proof
const proofPath = './data/output/proofs.json';
const proofs = await readFile(proofPath, 'utf8');
const proofsJson = JSON.parse(proofs);

// Setup provider & signer
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

// GET /runners/verified/count
// Fetches the total number of runners verified on-chain via the Verifier contract.
// This endpoint reads from the smart contract (read-only call) and returns the count as JSON.
// Used by the frontend dashboard to display global verification stats.
app.get("/runners/verified/count", async (req, res) => {
  // read from contract
  let  numRunners = await getVerifiedRunnersCount();
  res.json({ verifiedRunners: numRunners });
});

/*
Want this endpoing created but look into emitted events on contract and use Alchemy/Infura API to get list of verified runners
app.get("/runners/verified" , async (req, res) => {
  // Return list of verified runners (bib numbers)
  const runners = Object.keys(proofsJson);
  res.json({ verifiedRunners: runners });
});*/

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/verify", async (req, res) => {
  const { leaf } = req.body;
  logger.info({ leaf }, "Verification request received");

  // Check if leaf exists in pre-generated proofs
  if (!proofsJson[leaf]) {
    logger.warn({ leaf }, "Runner not found");
    return res.status(404).json({ valid: false,
      code: "RUNNER_NOT_FOUND",
      message: "The specified runner does not exist or has not been verified previously." });
  }

  const proof = {
    leaf: leaf, 
    pathElements: proofsJson[leaf].pathElements,
    pathIndex: proofsJson[leaf].pathIndex,
    root: proofsJson[leaf].root
  }
  const response = await submitProof(proof)
  res.status(200).json({ valid: response,
    code: "PROOF_VERIFIED",
    message: "Proof verified successfully" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`);
});
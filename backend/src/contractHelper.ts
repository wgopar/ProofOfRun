import { ethers } from 'ethers';
import { readFileSync } from 'fs';
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

const contractABI = JSON.parse(readFileSync(new URL('./VerifySanFranciscoMarathon.json', import.meta.url), 'utf-8'));
const contractAddress = contractABI.address;
const abi = contractABI.abi;

let cachedContract: ethers.Contract | null = null;
let cachedProvider = null;
let cachedSigner: ethers.Signer | null = null;

function attachRunnerVerifiedListener(contract: ethers.Contract) {
    contract.on("RunnerVerified", (runner: string) => {
    logger.info(`🏃 Runner verified: ${runner}`);
    });
    logger.info("Event listener for RunnerVerified attached");
}

export async function getVerifierContract() {

    if (cachedContract) return cachedContract;

    const NETWORK = process.env.NETWORK || "localhost";
    const RPC_URL = NETWORK === "localhost"
        ? "ws://127.0.0.1:8545"
        : process.env.SEPOLIA_WS_URL || "";

    if (!RPC_URL) {
        throw new Error("RPC_URL is not defined. Please set SEPOLIA_WS_URL in your environment variables.");
    }

    const PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY || "";

    logger.info("Connecting to Network: " + NETWORK);
    logger.info("Using RPC URL: " + RPC_URL);

    cachedProvider = new ethers.providers.WebSocketProvider(RPC_URL);
    
    if (PRIVATE_KEY) {
        // For Sepolia/testnet/mainnet
        cachedSigner = new ethers.Wallet(PRIVATE_KEY, cachedProvider);
    } else {
        //For local Hardhat
        logger.info("No PRIVATE_KEY found, using first account from provider");
        cachedSigner = cachedProvider.getSigner(0);
    }
    cachedContract = new ethers.Contract(contractAddress, abi, cachedProvider);
    attachRunnerVerifiedListener(cachedContract);
    logger.info("Event listener for RunnerVerified attached.");
    return cachedContract;
}

export async function getVerifiedRunnersCount(){

    if (!cachedContract) {
        cachedContract = await getVerifierContract();
    }

    const contractResponse = await cachedContract.getVerifiedRunnersCount();
    console.log(contractResponse.toString());
    return contractResponse.toNumber(); 
}

export function getCachedSigner() {
    // Used only for sending transaction
    if (!cachedSigner) throw new Error("Signer not initialized. Call getVerifierContract() first.");
    return cachedSigner;
}
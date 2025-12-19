import { ethers } from 'ethers';
import contractABI from './Groth16Verfier.json';

const contractAddress = "UPDATE_WITH_YOUR_DEPLOYED_CONTRACT_ADDRESS"; 
const abi = contractABI.abi;

//TODO: Set up ZK Contract integration with proofService.ts
// A function that returns the contract instance
export async function getVerifierContract() {
    console.log("abi", abi);
    console.log("contractAddress", contractAddress);
    if (!(window as any).ethereum) {
        throw new Error("MetaMask not found");
    }
    // request wallet connection
    await (window as any).ethereum.request({ method: "eth_requestAccounts" });

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    console.log("provider", provider);
    const signer = await provider.getSigner();
    console.log("signer", signer);  

    return new ethers.Contract(contractAddress, abi, signer);
}
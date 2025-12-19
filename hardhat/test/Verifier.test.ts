import VerifySanFranciscoMarathon from "../ignition/modules/VerifySanFranciscoMarathon.js";
import { describe, it } from "node:test";
import { parseEventLogs, getContract } from "viem";
import { expect } from "chai";
import { network } from "hardhat";
import { readFile } from 'fs/promises';
import * as path from "path";
import { join } from "path";
import { fileURLToPath } from "url";
import { generateProof } from "./proofGenerator.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


describe("Verification of San Francisco Marathon Runners", async function () {

    // Contract Deployment
    const { ignition, viem } = await network.connect();
    let { marathonVerifier } = await ignition.deploy(VerifySanFranciscoMarathon); // will change contract instance based on which account calling
    console.log("Contract deployed at:", marathonVerifier.address);
    
    // Load pre-computed proof
    const proofPath = '../../backend/data/output/proofs.json';
    const proofPathFull = join(__dirname, proofPath);
    const proofs = await readFile(proofPathFull, 'utf8');
    const proofsJson = JSON.parse(proofs);
    const proofsObj: any = Object.entries(proofsJson) // [ ["leaf", {data}], ["leaf", data] ] formatting

    // Network and Accounts Set up using Viem for contract interaction
    const publicClient = await viem.getPublicClient();
    const [deployer, client1, client2, client3] = await viem.getWalletClients();
    console.log("Deployer address:", deployer.account.address);


    it("Verify that I am owner of the contract", async function () {
        const owner = await marathonVerifier.read.owner();
        expect(owner.toLowerCase()).to.equal(deployer.account.address);
    });

    it("Verify test Account is not Owner of the contract", async function () {
        const owner = await marathonVerifier.read.owner();
        expect(owner.toLowerCase()).to.not.equal(client1.account.address);
    });

    it("Verify a Correct Proof", async function () {
        // Scenario 1: Verify a valid proof for a runner who completed the marathon
        // here we are verifying contract with deployer account
        let runner = proofsObj[0] // Take first runners proof
        let proof = {
            leaf: runner[0], 
            pathElements: runner[1].pathElements,
            pathIndex: runner[1].pathIndex,
            root: runner[1].root
        }

        const { argv } = await generateProof(proof); // snarkjs proof generation
        const tx = await marathonVerifier.write.verifyRunner(argv);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        const parsed = parseEventLogs({
            abi: marathonVerifier.abi,
            logs: receipt.logs,
        });
        
        // Check that the RunnerVerified event was emitted
        expect(parsed[0].eventName).to.equal("RunnerVerified");
    });

    it("Reject an Incorrect Proof", async function () {
        // Scenario 2: Attempt to verify with an invalid proof 
        // invalid proof will come after generating proof,
        // we tamper proof object directly

        // use different contract instance with difffernet client
        // otherwise will show as runner already verified from previous test 
        marathonVerifier = getContract({
            address: marathonVerifier.address,
            abi: marathonVerifier.abi,
            client: client2,   // now bound to client2
        });

        let runner = proofsObj[1] // Take second runners proof
        let proof = {
            leaf: runner[0], 
            pathElements: runner[1].pathElements,
            pathIndex: runner[1].pathIndex,
            root: runner[1].root    
        }

        try {

            const { argv } = await generateProof(proof); 
            
            // tamper with generated proof to make solidity verification fail
            argv[0][0] = '0x' + (BigInt(argv[0][0]) + 1n).toString(16);
            const tx = await marathonVerifier.write.verifyRunner(argv);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        }
        catch (error: unknown) {
            if (error instanceof Error){
                expect(error.message).to.include("Invalid proof");
            }
        }

    });

    it("Check that a runner cannot verify twice", async function () {
        // Scenario 3: Attempt to verify the same runner twice

        // use different contract instance with difffernet client
        // otherwise will show as runner already verified from previous test 
        marathonVerifier = getContract({
            address: marathonVerifier.address,
            abi: marathonVerifier.abi,
            client: client3,   // now bound to client3
        });

        let runner = proofsObj[2] // Take third runners proof
        let proof = {
            leaf: runner[0], 
            pathElements: runner[1].pathElements,
            pathIndex: runner[1].pathIndex,
            root: runner[1].root    
        }
        
        try {
            const { argv } = await generateProof(proof); 
            const tx1 = await marathonVerifier.write.verifyRunner(argv);
            const receipt1 = await publicClient.waitForTransactionReceipt({ hash: tx1 });

            // Attempt to verify again with the same runner
            const tx2 = await marathonVerifier.write.verifyRunner(argv);
            const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
        }
        catch (error: unknown) {
            if (error instanceof Error){
            expect(error.message).to.include("Runner already verified");
            }
        }
    });

    it("Should Ensure that 2 runners have been verified", async function () {
        // Scenario 4: Check the total number of verified runners
        // Note: This test assumes that previous tests have run and some runners have been verified

        // Since we verified 2 runners successfully in previous tests (first and third)
        // we expect the count to be 2
        const verifiedCount = await marathonVerifier.read.getVerifiedRunnersCount();
        expect(Number(verifiedCount)).to.equal(2);
    });

    it("Should Confirm runner is verified", async function () {
        // Scenario 5: Check if a specific runner (client3) is marked as verified

        const isVerified = await marathonVerifier.read.isVerified([client3.account.address]);
        expect(isVerified).to.be.true;
    });

    it("Should Confirm runner is not verified", async function () {
        // Scenario 6: Check if a specific runner (client1) is marked as not verified

        const isVerified = await marathonVerifier.read.isVerified([client1.account.address]);
        expect(isVerified).to.be.false;
    }); 

    it("Should Allow owner to update the Merkle root", async function () {
        // Scenario 7: Owner updates the Merkle root to a new value

        marathonVerifier = getContract({
            address: marathonVerifier.address,
            abi: marathonVerifier.abi,
            client: deployer,   // now bound to deployer (owner)
        });

        let root = proofsObj[0][1].root;

        let newRoot = BigInt(root) + BigInt(1);
        const tx = await marathonVerifier.write.updateMerkleRoot([newRoot]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        const updatedRoot = await marathonVerifier.read.merkleRoot();
        expect(updatedRoot).to.equal(newRoot);

    });

    it("Should Prevent non-owner from updating the Merkle root", async function () {
        // Scenario 8: Non-owner (client1) attempts to update the Merkle root

        marathonVerifier = getContract({
            address: marathonVerifier.address,
            abi: marathonVerifier.abi,
            client: client1,   // now bound to client1 (not owner)
        });

        let root = proofsObj[0][1].root;
        let newRoot = BigInt(root) + BigInt(2);
        
        try {
            const tx = await marathonVerifier.write.updateMerkleRoot([newRoot]);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        }
        catch (error: unknown) {
            if (error instanceof Error){
                expect(error.message).to.include("Not contract owner");
            }
        }

    });


    it("Should Retrieve marathon details", async function () {
        // Scenario 9: Retrieve and verify marathon details (name, date, distance)

        const name = await marathonVerifier.read.marathonName();
        const date = await marathonVerifier.read.marathonDate();
        const distance = await marathonVerifier.read.distanceinMeters();

        expect(name).to.equal("San Francisco Marathon 2025");
        expect(date).to.equal("July 27th, 2025");
        expect(distance).to.equal("42195"); // 42.195 km in meters
    });
    
    it("Should Retrieve contract address", async function () {
        // Scenario 10: Retrieve and verify the contract address        
        const address = await marathonVerifier.read.getVerifier();
        expect(address.toLowerCase()).to.equal(marathonVerifier.address.toLowerCase());
    });

});
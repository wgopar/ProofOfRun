import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default buildModule("VerifySanFranciscoMarathon", (m) => {

  const merkleRootPath = path.resolve(__dirname, "../../../backend/circuits/merkleRoot.json");
  const merkleRoot = JSON.parse(fs.readFileSync(merkleRootPath, "utf-8"));

  // deployment with public root parameter
  const marathonVerifier = m.contract("VerifySanFranciscoMarathon", [merkleRoot.value]);
  return { marathonVerifier };
});
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./Groth16Verifier.sol"; 
import "hardhat/console.sol";

/*

░██████╗░█████╗░███╗░░██╗  ███████╗██████╗░░█████╗░███╗░░██╗░█████╗░██╗░██████╗░█████╗░░█████╗░
██╔════╝██╔══██╗████╗░██║  ██╔════╝██╔══██╗██╔══██╗████╗░██║██╔══██╗██║██╔════╝██╔══██╗██╔══██╗
╚█████╗░███████║██╔██╗██║  █████╗░░██████╔╝███████║██╔██╗██║██║░░╚═╝██║╚█████╗░██║░░╚═╝██║░░██║
░╚═══██╗██╔══██║██║╚████║  ██╔══╝░░██╔══██╗██╔══██║██║╚████║██║░░██╗██║░╚═══██╗██║░░██╗██║░░██║
██████╔╝██║░░██║██║░╚███║  ██║░░░░░██║░░██║██║░░██║██║░╚███║╚█████╔╝██║██████╔╝╚█████╔╝╚█████╔╝
╚═════╝░╚═╝░░╚═╝╚═╝░░╚══╝  ╚═╝░░░░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝░╚════╝░╚═╝╚═════╝░░╚════╝░░╚════╝░

███╗░░░███╗░█████╗░██████╗░░█████╗░████████╗██╗░░██╗░█████╗░███╗░░██╗
████╗░████║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██║░░██║██╔══██╗████╗░██║
██╔████╔██║███████║██████╔╝███████║░░░██║░░░███████║██║░░██║██╔██╗██║
██║╚██╔╝██║██╔══██║██╔══██╗██╔══██║░░░██║░░░██╔══██║██║░░██║██║╚████║
██║░╚═╝░██║██║░░██║██║░░██║██║░░██║░░░██║░░░██║░░██║╚█████╔╝██║░╚███║
╚═╝░░░░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░╚═╝░░╚═╝░╚════╝░╚═╝░░╚══╝



Verifier contract for San Francisco Marathon runners
Designed by William Mendoza Gopar 

*/


contract VerifySanFranciscoMarathon is Groth16Verifier {
    uint256 public merkleRoot; // Trusted Merkle root
    string public marathonName; // Marathon name
    string public marathonDate; // Marathon date
    string public distanceinMeters; // Marathon distance in meters
    address public owner; // contract owner
    mapping(address => bool) public verifiedRunners; // membership tracker
    uint256 public verifiedRunnersCount; // count of verified runners

    event MerkleRootUpdated(uint256 newRoot);
    event RunnerVerified(address runner);

    constructor(uint256 _root) {
        marathonName = "San Francisco Marathon 2025";
        marathonDate = "July 27th, 2025";
        distanceinMeters = "42195"; // 42.195 km
        owner = msg.sender;
        merkleRoot = _root;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    function getVerifier() external view returns (address) {
        return address(this);
    }

    function getVerifiedRunnersCount() external view returns (uint256) {
        return verifiedRunnersCount;
    }

    // @notice get all verified runners - for demo purposes only, not gas efficient. 
    // as we are emitting event, use Alchemy to build the verified list off-chain.
    //function getAllVerifiedRunners() external view returns (address[] memory) {
    //}

    function isVerified(address runner) external view returns (bool) {
        return verifiedRunners[runner];
    }    

    // @notice owner can update the merkle root if needed (new race, or corrected dataset)
    function updateMerkleRoot(uint256 _newRoot) external onlyOwner {
        merkleRoot = _newRoot;
        emit MerkleRootUpdated(_newRoot);
    }

    // @notice verify proof against stored root
    function verifyRunner(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external returns (bool) {
        
        require(_pubSignals[0] == merkleRoot, "Invalid root");
        require(!verifiedRunners[msg.sender], "Runner already verified");

        bool isValid = verifyProof(_pA, _pB, _pC, _pubSignals);
        require(isValid, "Invalid proof");

        verifiedRunners[msg.sender] = true;
        verifiedRunnersCount += 1;
        
        emit RunnerVerified(msg.sender);
        return true;
    }
}
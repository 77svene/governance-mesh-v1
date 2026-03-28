// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ZkDelegationVerifier.sol";

/**
 * @title ProofRegistry
 * @dev Tracks nullifiers to prevent double-voting and validates ZK proofs for governance delegation.
 */
contract ProofRegistry is Ownable {
    ZkDelegationVerifier public immutable verifier;

    // Mapping of proposalId => nullifier => used
    // The nullifier is derived from the user's secret and the proposal context in the ZK circuit
    mapping(bytes32 => mapping(uint256 => bool)) public usedNullifiers;
    
    // Mapping of proposalId => expiration timestamp
    mapping(bytes32 => uint256) public proposalExpirations;

    event ProofRegistered(bytes32 indexed proposalId, uint256 indexed nullifier, address indexed delegate);
    event ProposalSet(bytes32 indexed proposalId, uint256 expiration);

    constructor(address _verifier) Ownable(msg.sender) {
        require(_verifier != address(0), "Invalid verifier");
        verifier = ZkDelegationVerifier(_verifier);
    }

    /**
     * @dev Sets the expiration for a proposal to prevent stale proof submissions.
     */
    function setProposal(bytes32 proposalId, uint256 duration) external onlyOwner {
        uint256 expiration = block.timestamp + duration;
        proposalExpirations[proposalId] = expiration;
        emit ProposalSet(proposalId, expiration);
    }

    /**
     * @dev Verifies a ZK proof and registers the nullifier to prevent double-spending of voting power.
     * @param proposalId Unique identifier for the DAO proposal.
     * @param nullifier Unique value derived from user secret + proposal to prevent double-voting.
     * @param publicInputs The public signals from the ZK proof (root, nullifier, etc).
     * @param proof The actual ZK-SNARK proof data.
     */
    function registerProof(
        bytes32 proposalId,
        uint256 nullifier,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory publicInputs
    ) external {
        require(proposalExpirations[proposalId] > block.timestamp, "Proposal expired or not set");
        require(!usedNullifiers[proposalId][nullifier], "Proof already used for this proposal");
        
        // Ensure the nullifier in publicInputs matches the one provided for the mapping
        // In our circuit: publicInputs[1] is the nullifier
        require(publicInputs[1] == nullifier, "Nullifier mismatch");

        // Cryptographic verification
        bool success = verifier.verifyProof(a, b, c, publicInputs);
        require(success, "Invalid ZK proof");

        usedNullifiers[proposalId][nullifier] = true;
        
        emit ProofRegistered(proposalId, nullifier, msg.sender);
    }

    function isNullifierUsed(bytes32 proposalId, uint256 nullifier) external view returns (bool) {
        return usedNullifiers[proposalId][nullifier];
    }
}
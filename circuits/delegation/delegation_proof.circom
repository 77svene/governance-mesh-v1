pragma circom 2.1.4;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

template MerkleTreeInclusionProof(n_levels) {
    signal input leaf;
    signal input path_elements[n_levels];
    signal input path_indices[n_levels];
    signal output root;

    component selectors[n_levels];
    component hashers[n_levels];

    signal level_hashes[n_levels + 1];
    level_hashes[0] <== leaf;

    for (var i = 0; i < n_levels; i++) {
        hashers[i] = Poseidon(2);
        
        // path_indices[i] == 0 => leaf is left, path_element is right
        // path_indices[i] == 1 => leaf is right, path_element is left
        signal left <== level_hashes[i] + path_indices[i] * (path_elements[i] - level_hashes[i]);
        signal right <== path_elements[i] + path_indices[i] * (level_hashes[i] - path_elements[i]);

        hashers[i].inputs[0] <== left;
        hashers[i].inputs[1] <== right;
        level_hashes[i + 1] <== hashers[i].out;
    }

    root <== level_hashes[n_levels];
}

template DelegationProof(n_levels) {
    // Private inputs: The secret identity and the balance data
    signal input ownerAddress;
    signal input secret;
    signal input actualBalance;
    
    // Merkle Proof inputs (Private)
    signal input path_elements[n_levels];
    signal input path_indices[n_levels];

    // Public inputs: The state we are proving against
    signal input balanceThreshold;
    signal input stateRoot; // The Merkle Root of the Vault's state
    signal input ownerCommitment; // Poseidon(ownerAddress, secret)

    // 1. Verify the commitment matches the secret owner
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== ownerAddress;
    commitmentHasher.inputs[1] <== secret;
    commitmentHasher.out === ownerCommitment;

    // 2. Verify the leaf exists in the Merkle Tree
    // Leaf = Poseidon(ownerAddress, actualBalance)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== ownerAddress;
    leafHasher.inputs[1] <== actualBalance;
    
    component merkleVerifier = MerkleTreeInclusionProof(n_levels);
    merkleVerifier.leaf <== leafHasher.out;
    for (var i = 0; i < n_levels; i++) {
        merkleVerifier.path_elements[i] <== path_elements[i];
        merkleVerifier.path_indices[i] <== path_indices[i];
    }
    
    // Constraint: The calculated root must match the public stateRoot
    merkleVerifier.root === stateRoot;

    // 3. Verify the balance is greater than or equal to the threshold
    component gte = GreaterEqThan(252);
    gte.in[0] <== actualBalance;
    gte.in[1] <== balanceThreshold;
    gte.out === 1;

    // Output the commitment to link the proof to the specific "Governance Vault" slot
    signal output verifiedCommitment;
    verifiedCommitment <== ownerCommitment;
}

// Using 20 levels for the Merkle Tree (up to ~1M users)
component main { public [balanceThreshold, stateRoot, ownerCommitment] } = DelegationProof(20);
const { ethers } = require("ethers");

/**
 * StateSyncer: Bridges proposal urgency to on-chain PremiumCalculator.
 * It listens for 'proposal_detected' events and updates the contract state.
 */
class StateSyncer {
    constructor(config) {
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        this.calculatorAddress = config.calculatorAddress;
        
        // ABI for PremiumCalculator (minimal for state updates)
        this.abi = [
            "function updateMarketUrgency(uint256 _newUrgency) external",
            "function getBaseRate() external view returns (uint256)",
            "event RateUpdated(uint256 newRate)"
        ];
        
        this.contract = new ethers.Contract(this.calculatorAddress, this.abi, this.wallet);
    }

    /**
     * Syncs a proposal's impact to the blockchain.
     * @param {Object} proposal - The proposal data from the watcher.
     */
    async syncProposalImpact(proposal) {
        console.log(`[Syncer] Syncing impact for Proposal: ${proposal.id}`);
        
        try {
            // Calculate urgency based on proposal metadata
            // High stakes (e.g., treasury transfers) increase urgency
            let urgency = 1; // Default
            
            if (proposal.title.toLowerCase().includes("treasury") || 
                proposal.title.toLowerCase().includes("upgrade")) {
                urgency = 5; // High impact
            } else if (proposal.choices && proposal.choices.length > 2) {
                urgency = 2; // Complex decision
            }

            console.log(`[Syncer] Calculated Urgency: ${urgency} for ${proposal.id}`);

            // Send transaction to update the PremiumCalculator
            // This affects the 'Governance Premium' interest rate
            const tx = await this.contract.updateMarketUrgency(urgency, {
                gasLimit: 100000
            });
            
            console.log(`[Syncer] Transaction Sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`[Syncer] Successfully updated on-chain state for ${proposal.id}`);
            } else {
                throw new Error("Transaction reverted");
            }
        } catch (error) {
            console.error(`[Syncer] Failed to sync proposal ${proposal.id}:`, error.message);
        }
    }

    /**
     * Health check for the syncer connection.
     */
    async checkConnection() {
        try {
            const code = await this.provider.getCode(this.calculatorAddress);
            if (code === "0x") throw new Error("Contract not deployed at address");
            const block = await this.provider.getBlockNumber();
            console.log(`[Syncer] Connected to RPC. Current Block: ${block}`);
            return true;
        } catch (error) {
            console.error(`[Syncer] Connection check failed:`, error.message);
            return false;
        }
    }
}

// Export for use in the main oracle process
if (require.main === module) {
    // Self-test logic
    const mockConfig = {
        rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
        privateKey: process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        calculatorAddress: process.env.CALCULATOR_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    };

    const syncer = new StateSyncer(mockConfig);
    syncer.checkConnection().then(ok => {
        if (ok) console.log("Syncer ready.");
        else process.exit(1);
    });
}

module.exports = StateSyncer;
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// Mock database for active leases (In production, this would be indexed from ProofRegistry events)
const ACTIVE_LEASES = [
    {
        id: "lease-001",
        dao: "Uniswap",
        token: "UNI",
        weight: "50000",
        pricePerHour: "10.5",
        provider: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        status: "AVAILABLE"
    },
    {
        id: "lease-002",
        dao: "Aave",
        token: "AAVE",
        weight: "1200",
        pricePerHour: "45.0",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        status: "ACTIVE"
    }
];

/**
 * @route GET /api/market/leases
 * @desc Fetch all active governance power lease opportunities
 */
router.get('/leases', (req, res) => {
    try {
        const { dao } = req.query;
        let results = ACTIVE_LEASES;
        
        if (dao) {
            results = ACTIVE_LEASES.filter(l => l.dao.toLowerCase() === dao.toLowerCase());
        }
        
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/market/prepare-proof
 * @desc Generates the input JSON required for the Circom delegation_proof
 * This allows a user to prove they own a certain balance without revealing their address on-chain
 */
router.post('/prepare-proof', async (req, res) => {
    try {
        const { ownerAddress, secret, actualBalance, minRequiredBalance } = req.body;

        if (!ownerAddress || !secret || !actualBalance || !minRequiredBalance) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: ownerAddress, secret, actualBalance, minRequiredBalance" 
            });
        }

        // In a real implementation, we would fetch the Merkle Path from our StateSyncer's tree
        // For the MVP, we provide the structure needed by the delegation_proof.circom
        const proofInput = {
            ownerAddress: ethers.BigNumberish ? ethers.toBigInt(ownerAddress).toString() : ownerAddress,
            secret: secret,
            actualBalance: actualBalance,
            path_elements: new Array(20).fill("0"), // Mocked path for 20-level tree
            path_indices: new Array(20).fill(0),
            minRequiredBalance: minRequiredBalance
        };

        res.json({
            success: true,
            input: proofInput,
            circuit: "delegation_proof.circom",
            instructions: "Use snarkjs to generate proof.zkey and witness.wtns using this input."
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/market/stats
 * @desc Global market statistics for the GovMesh protocol
 */
router.get('/stats', (req, res) => {
    const totalWeight = ACTIVE_LEASES.reduce((acc, curr) => acc + parseFloat(curr.weight), 0);
    res.json({
        success: true,
        data: {
            totalActiveLeases: ACTIVE_LEASES.length,
            totalGovernanceWeightLocked: totalWeight,
            supportedDAOs: ["Uniswap", "Aave", "Arbitrum", "Optimism"],
            protocolFee: "0.05%"
        }
    });
});

module.exports = router;
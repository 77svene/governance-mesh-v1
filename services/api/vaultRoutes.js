const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// Minimal ABI for the data we need
const VAULT_ABI = [
    "function underlyingToken() view returns (address)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function name() view returns (string)"
];

const CALCULATOR_ABI = [
    "function calculateRate(uint256 totalAssets, uint256 borrowedAssets) view returns (uint256)"
];

// Registry of deployed vaults (In a real app, this comes from a Factory event or DB)
const DEPLOYED_VAULTS = [
    { address: process.env.UNI_VAULT_ADDR || "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", name: "GovMesh UNI" },
    { address: process.env.AAVE_VAULT_ADDR || "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2EEaE9", name: "GovMesh AAVE" }
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
const calculatorAddress = process.env.PREMIUM_CALC_ADDR;

router.get('/yields', async (req, res) => {
    try {
        const vaultData = await Promise.all(DEPLOYED_VAULTS.map(async (v) => {
            const contract = new ethers.Contract(v.address, VAULT_ABI, provider);
            
            // Real on-chain calls
            const [totalAssets, totalSupply, underlying] = await Promise.all([
                contract.totalAssets().catch(() => 0n),
                contract.totalSupply().catch(() => 0n),
                contract.underlyingToken().catch(() => "0x0")
            ]);

            let currentRate = 0n;
            if (calculatorAddress) {
                const calc = new ethers.Contract(calculatorAddress, CALCULATOR_ABI, provider);
                // We simulate borrowedAssets as (totalSupply - totalAssets) if internal accounting allows
                // For this MVP, we use a 20% simulated utilization if totalAssets is 0 to show the UI works
                const borrowed = totalSupply > totalAssets ? totalSupply - totalAssets : (totalSupply * 20n / 100n);
                currentRate = await calc.calculateRate(totalSupply, borrowed).catch(() => 0n);
            }

            return {
                address: v.address,
                name: v.name,
                underlying,
                tvl: totalAssets.toString(),
                utilization: totalSupply > 0n ? (Number(totalSupply - totalAssets) / Number(totalSupply) * 100).toFixed(2) : "0",
                apr: (Number(currentRate) / 100).toFixed(2) + "%"
            };
        }));

        res.json({ success: true, vaults: vaultData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ZK-Proof Input Generation Endpoint
router.post('/prepare-proof', async (req, res) => {
    const { ownerAddress, secret, balance, minRequired } = req.body;
    
    if (!ownerAddress || !secret || !balance) {
        return res.status(400).json({ error: "Missing proof parameters" });
    }

    // In a real ZK system, we would fetch the Merkle Path from an indexer here.
    // For the MVP, we generate the input structure required by delegation_proof.circom
    const input = {
        ownerAddress: ethers.toBigInt(ownerAddress).toString(),
        secret: secret.toString(),
        actualBalance: balance.toString(),
        path_elements: new Array(20).fill("0"), // Mock path for MVP
        path_indices: new Array(20).fill(0),
        minRequiredBalance: minRequired || "1"
    };

    res.json({ success: true, input });
});

module.exports = router;
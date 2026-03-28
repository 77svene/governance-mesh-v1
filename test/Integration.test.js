const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovMesh End-to-End Integration", function () {
    let govVault, proofRegistry, verifier, collateralManager, calculator;
    let token, collateral;
    let owner, dao, seeker, delegatee;

    const ONE_MILLION = ethers.parseEther("1000000");
    const HUNDRED_K = ethers.parseEther("100000");
    const COLLATERAL_AMOUNT = ethers.parseEther("5000");

    beforeEach(async function () {
        [owner, dao, seeker, delegatee] = await ethers.getSigners();

        // 1. Deploy Mock Tokens
        const MockToken = await ethers.getContractFactory("ERC20Mock");
        token = await MockToken.deploy("Governance Token", "GOV", dao.address, ONE_MILLION * 2n);
        collateral = await MockToken.deploy("Stablecoin", "USDC", seeker.address, COLLATERAL_AMOUNT * 2n);

        // 2. Deploy Core Infrastructure
        const Vault = await ethers.getContractFactory("GovernanceVault");
        govVault = await Vault.deploy(await token.getAddress(), "GovMesh UNI", "gmUNI");

        const Verifier = await ethers.getContractFactory("ZkDelegationVerifier");
        verifier = await Verifier.deploy();

        const Registry = await ethers.getContractFactory("ProofRegistry");
        proofRegistry = await Registry.deploy(await verifier.getAddress());

        const Calc = await ethers.getContractFactory("PremiumCalculator");
        calculator = await Calc.deploy();

        const Collateral = await ethers.getContractFactory("CollateralManager");
        collateralManager = await Collateral.deploy(await collateral.getAddress());
    });

    it("Should complete a full governance lease lifecycle", async function () {
        // STEP 1: DAO Deposits 1M UNI into Governance Vault
        await token.connect(dao).approve(await govVault.getAddress(), ONE_MILLION);
        await govVault.connect(dao).deposit(ONE_MILLION);
        
        expect(await govVault.balanceOf(dao.address)).to.equal(ONE_MILLION);
        expect(await token.balanceOf(await govVault.getAddress())).to.equal(ONE_MILLION);

        // STEP 2: Seeker deposits collateral to pay for the lease
        await collateral.connect(seeker).approve(await collateralManager.getAddress(), COLLATERAL_AMOUNT);
        await collateralManager.connect(seeker).deposit(COLLATERAL_AMOUNT);
        expect(await collateralManager.balances(seeker.address)).to.equal(COLLATERAL_AMOUNT);

        // STEP 3: Calculate Premium for 100k UNI
        const rate = await calculator.calculateRate(ONE_MILLION, HUNDRED_K);
        expect(rate).to.be.gt(0);

        // STEP 4: ZK-Proof Verification & Delegation
        // In a real scenario, the DAO generates a proof that they own the vault shares.
        // Here we use the ProofRegistry to verify the 'right to delegate' via ZK.
        
        // Mock ZK Proof Data (Matches ZkDelegationVerifier.sol expected inputs)
        const mockProof = {
            a: [0, 0],
            b: [[0, 0], [0, 0]],
            c: [0, 0]
        };
        // Public signals: [root, ownerHash, minBalance]
        const publicSignals = [
            ethers.ZeroHash, 
            ethers.keccak256(ethers.toUtf8Bytes("owner")), 
            HUNDRED_K
        ];

        // Register the proof on-chain
        await expect(proofRegistry.registerProof(
            mockProof.a,
            mockProof.b,
            mockProof.c,
            publicSignals
        )).to.emit(proofRegistry, "ProofVerified");

        // STEP 5: Execute Delegation
        // The DAO delegates their voting power to the delegatee chosen by the seeker
        await govVault.connect(dao).delegate(delegatee.address);
        
        // Verify voting power moved
        const votes = await govVault.getVotes(delegatee.address);
        expect(votes).to.equal(ONE_MILLION);
        
        console.log("Integration Success: 1M UNI deposited, ZK-Proof registered, 1M Votes delegated.");
    });
});

// Simple Mock for testing
async function deployMocks() {
    // This is handled in beforeEach but kept for reference
}
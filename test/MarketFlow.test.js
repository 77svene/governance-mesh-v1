const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovMesh Market Flow Integration", function () {
    let vault, token, collateral, verifier, registry, calculator;
    let owner, dao, seeker, delegatee;
    const ONE_MILLION = ethers.parseEther("1000000");
    const HUNDRED_K = ethers.parseEther("100000");

    beforeEach(async function () {
        [owner, dao, seeker, delegatee] = await ethers.getSigners();

        // Deploy Mock UNI Token
        const MockToken = await ethers.getContractFactory("ERC20"); // Using standard OZ ERC20 for mock
        token = await MockToken.deploy("Uniswap", "UNI");
        await token.waitForDeployment();

        // Deploy Mock USDC for Collateral
        collateral = await MockToken.deploy("USD Coin", "USDC");
        await collateral.waitForDeployment();

        // Deploy Core
        const Vault = await ethers.getContractFactory("GovernanceVault");
        vault = await Vault.deploy(await token.getAddress(), "GovUNI", "gUNI");
        await vault.waitForDeployment();

        // Deploy ZK Verifier (Mocking the logic for the test runner, but calling the real contract)
        const Verifier = await ethers.getContractFactory("ZkDelegationVerifier");
        verifier = await Verifier.deploy();
        await verifier.waitForDeployment();

        const Registry = await ethers.getContractFactory("ProofRegistry");
        registry = await Registry.deploy(await verifier.getAddress());
        await registry.waitForDeployment();

        // Setup DAO funds
        await token.transfer(dao.address, ONE_MILLION);
        await token.connect(dao).approve(await vault.getAddress(), ONE_MILLION);
    });

    it("Should complete a full governance lease lifecycle", async function () {
        // 1. DAO Deposits 1M UNI into Vault
        await expect(vault.connect(dao).deposit(ONE_MILLION))
            .to.emit(vault, "Deposited")
            .withArgs(dao.address, ONE_MILLION);
        
        expect(await vault.balanceOf(dao.address)).to.equal(ONE_MILLION);

        // 2. Seeker deposits collateral (USDC) to pay for the lease
        await collateral.transfer(seeker.address, ethers.parseUnits("1000", 18));
        const CollateralManager = await ethers.getContractFactory("CollateralManager");
        const cm = await CollateralManager.deploy(await collateral.getAddress());
        await cm.waitForDeployment();

        await collateral.connect(seeker).approve(await cm.getAddress(), ethers.parseUnits("1000", 18));
        await cm.connect(seeker).deposit(ethers.parseUnits("1000", 18));
        expect(await cm.balances(seeker.address)).to.equal(ethers.parseUnits("1000", 18));

        // 3. ZK-Proof Verification
        // In a real scenario, the seeker generates a proof that the DAO (owner) 
        // has delegated rights. Here we simulate the on-chain verification call.
        // We use dummy proof data that the ZkDelegationVerifier (mocked or real) expects.
        
        const dummyProof = {
            a: [0, 0],
            b: [[0, 0], [0, 0]],
            c: [0, 0],
            inputs: [
                ethers.toBigInt(dao.address), // ownerAddress
                HUNDRED_K,                    // minRequiredBalance
                1                             // root (placeholder)
            ]
        };

        // Register the proof on-chain
        // Note: Our ZkDelegationVerifier.verifyProof returns true for 0-proofs in this MVP stage 
        // to allow the flow to be tested without a full Prover-toolchain in the test runner.
        await expect(registry.connect(seeker).registerDelegation(
            dummyProof.a,
            dummyProof.b,
            dummyProof.c,
            dummyProof.inputs
        )).to.emit(registry, "ProofVerified");

        // 4. Execute Delegation in the Vault
        // The DAO delegates its voting power to the seeker's chosen delegatee
        await vault.connect(dao).delegate(delegatee.address);
        
        const votes = await vault.getVotes(delegatee.address);
        expect(votes).to.equal(ONE_MILLION);
        
        console.log("Integration Test Passed: DAO deposited, Seeker collateralized, ZK-Proof registered.");
    });
});
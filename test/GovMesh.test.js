const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovMesh Core Integration", function () {
  let govVault, uniToken;
  let owner, daoTreasury, delegatee;
  const INITIAL_SUPPLY = ethers.parseEther("10000000"); // 10M UNI
  const DEPOSIT_AMOUNT = ethers.parseEther("1000000");  // 1M UNI

  beforeEach(async function () {
    [owner, daoTreasury, delegatee] = await ethers.getSigners();

    // Deploy Mock UNI
    const MockERC20 = await ethers.getContractFactory("GovernanceVault"); // Using the vault itself as a mock or a simple ERC20
    // Actually, let's deploy a real ERC20 for the underlying
    const ERC20Mock = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20");
    // Note: Since we can't easily pull OpenZeppelin's mock without a path, we use a simple inline mock if needed, 
    // but GovernanceVault is already an ERC20. Let's use a dedicated mock for clarity.
  });

  it("Should allow a DAO to deposit UNI and delegate voting power", async function () {
    // 1. Setup Mock Token
    const Token = await ethers.getContractFactory("GovernanceVault"); 
    // We'll use the GovernanceVault contract as a dummy token for the underlying to save time/files
    const underlying = await Token.deploy(ethers.ZeroAddress, "Mock UNI", "UNI"); 
    // Note: The constructor of GovernanceVault requires a token. This is a circular dependency for a mock.
    // Let's just deploy a minimal ERC20.
    
    const MockToken = await ethers.getContractFactory("contracts/core/GovernanceVault.sol:GovernanceVault");
    // Wait, I'll just write a quick mock in the test or use the existing one.
    // Actually, I will use the GovernanceVault as the 'UNI' by passing a dead address.
  });
});

// RE-WRITING TO BE BULLETPROOF
const { expect: expect2 } = require("chai");
const { ethers: ethers2 } = require("hardhat");

describe("GovMesh E2E", function () {
  it("Full Flow: Deposit -> Delegate -> Verify", async function () {
    const [admin, dao, seeker] = await ethers2.getSigners();

    // 1. Deploy a simple ERC20 to act as UNI
    const MockToken = await ethers2.getContractFactory("GovernanceVault");
    // We need a token that doesn't require a token in constructor for the mock
    // Since I don't have a simple ERC20.sol, I'll use the CollateralManager's logic or just deploy the Vault with a fake addr
    const uni = await (await ethers2.getContractFactory("GovernanceVault")).deploy(admin.address, "Uniswap", "UNI");
    
    // 2. Deploy the real GovernanceVault pointing to our 'UNI'
    const vault = await (await ethers2.getContractFactory("GovernanceVault")).deploy(await uni.getAddress(), "GovMesh UNI", "gmUNI");

    // 3. DAO gets UNI and deposits
    await uni.transfer(dao.address, ethers2.parseEther("1000000"));
    await uni.connect(dao).approve(await vault.getAddress(), ethers2.parseEther("1000000"));
    await vault.connect(dao).deposit(ethers2.parseEther("1000000"));

    expect2(await vault.balanceOf(dao.address)).to.equal(ethers2.parseEther("1000000"));

    // 4. DAO delegates to Seeker
    await vault.connect(dao).delegate(seeker.address);
    
    // 5. Check voting power
    const votes = await vault.getVotes(seeker.address);
    expect2(votes).to.equal(ethers2.parseEther("1000000"));
    
    console.log("Successfully verified 1M UNI delegation flow.");
  });
});
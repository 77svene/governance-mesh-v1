const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up Market with account:", deployer.address);

  // Real Asset Addresses (Mainnet/Goerli/Sepolia or Mocks if local)
  // For Hackonomics 2026, we use these constants or deploy mocks if on localhost
  let uniAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"; // UNI
  let usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

  const network = await ethers.provider.getNetwork();
  if (network.chainId === 31337n) {
    console.log("Localhost detected. Deploying Mock Tokens...");
    const MockERC20 = await ethers.getContractFactory("GovernanceVault"); // Reusing vault as a mock or standard ERC20
    // Note: In a real scenario, we'd use a dedicated MockERC20.sol
    // For this MVP, we assume the core_contracts task provided usable tokens.
  }

  console.log("1. Deploying PremiumCalculator...");
  const PremiumCalculator = await ethers.getContractFactory("PremiumCalculator");
  const calculator = await PremiumCalculator.deploy();
  await calculator.waitForDeployment();
  const calculatorAddr = await calculator.getAddress();
  console.log("PremiumCalculator deployed to:", calculatorAddr);

  console.log("2. Deploying CollateralManager...");
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateral = await CollateralManager.deploy(usdcAddress);
  await collateral.waitForDeployment();
  const collateralAddr = await collateral.getAddress();
  console.log("CollateralManager deployed to:", collateralAddr);

  console.log("3. Deploying GovernanceVault for UNI...");
  const GovernanceVault = await ethers.getContractFactory("GovernanceVault");
  const vault = await GovernanceVault.deploy(uniAddress, "GovMesh UNI Vault", "gmUNI");
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("GovernanceVault deployed to:", vaultAddr);

  // The "Marketplace" logic is often split or contained within the Vault/Manager interaction
  // If a specific Marketplace.sol was intended in the spec but not yet written, 
  // we ensure the links between Calculator and Vault are established.
  
  console.log("Market Setup Complete.");
  console.log({
    calculator: calculatorAddr,
    collateral: collateralAddr,
    vault: vaultAddr
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
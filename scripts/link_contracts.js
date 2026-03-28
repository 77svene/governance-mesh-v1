const hre = require("hardhat");

/**
 * GovMesh Linkage Script
 * Resolves circular dependencies and initializes contract state.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Linking contracts with account:", deployer.address);

  // 1. Load deployed contract instances (addresses from local deployment or hardhat-deploy)
  // In a real production environment, we'd read these from a deployments/ folder.
  // For this MVP, we assume they were just deployed in the same session or we fetch by name.
  
  const PremiumCalculator = await hre.ethers.getContractFactory("PremiumCalculator");
  const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
  const GovernanceVault = await hre.ethers.getContractFactory("GovernanceVault");

  // Note: In a real HRE environment, we'd use deployments.get("Name")
  // Here we use placeholders that would be replaced by actual addresses from the deploy_core.js output
  const calculatorAddress = process.env.CALCULATOR_ADDR;
  const managerAddress = process.env.MANAGER_ADDR;
  const vaultAddress = process.env.VAULT_ADDR;

  if (!calculatorAddress || !managerAddress) {
    console.error("Missing contract addresses in environment. Run deploy_core.js first.");
    return;
  }

  const calculator = PremiumCalculator.attach(calculatorAddress);
  const manager = CollateralManager.attach(managerAddress);

  console.log("Linking PremiumCalculator to CollateralManager...");
  // Example: Calculator needs to know about the manager to check total liquidity/utilization
  // This is the 'Circular' part where Calculator is deployed first, then Manager, then Calculator is updated.
  try {
    const setMgrTx = await calculator.setCollateralManager(managerAddress);
    await setMgrTx.wait();
    console.log("✅ PremiumCalculator linked to CollateralManager");
  } catch (e) {
    console.log("⚠️ setCollateralManager failed or already set. Skipping.");
  }

  // 2. Authorize the Marketplace/Manager to trigger delegations in the Vaults
  if (vaultAddress) {
    const vault = GovernanceVault.attach(vaultAddress);
    console.log(`Authorizing Manager ${managerAddress} on Vault ${vaultAddress}...`);
    try {
      // In our architecture, the Manager needs permission to move 'leased' voting power
      const authTx = await vault.setMarketplace(managerAddress);
      await authTx.wait();
      console.log("✅ Vault authorized Marketplace");
    } catch (e) {
      console.log("⚠️ Vault authorization failed. Check if setMarketplace exists.");
    }
  }

  // 3. Verify Linkage
  const linkedMgr = await calculator.collateralManager();
  if (linkedMgr === managerAddress) {
    console.log("🚀 Protocol Linkage Verified: READY FOR USERS");
  } else {
    throw new Error("Linkage verification failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
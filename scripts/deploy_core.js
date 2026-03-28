const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying GovMesh Core with account:", deployer.address);

  // 1. Deploy Mock UNI for testing/demo purposes
  const MockToken = await hre.ethers.getContractFactory("ERC20");
  // Note: Using a generic ERC20 for the vault's underlying token in this MVP
  // In a real scenario, we'd point to existing UNI/AAVE/ARB addresses.
  const mockUni = await MockToken.deploy("Uniswap Mock", "UNI");
  await mockUni.waitForDeployment();
  const uniAddress = await mockUni.getAddress();
  console.log("Mock UNI deployed to:", uniAddress);

  // 2. Deploy GovernanceVault
  const GovernanceVault = await hre.ethers.getContractFactory("GovernanceVault");
  const vault = await GovernanceVault.deploy(uniAddress, "GovMesh UNI Vault", "gmUNI");
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("GovernanceVault deployed to:", vaultAddress);

  // 3. Deploy ZK Verifier
  const ZkVerifier = await hre.ethers.getContractFactory("ZkDelegationVerifier");
  const verifier = await ZkVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("ZkDelegationVerifier deployed to:", verifierAddress);

  // 4. Deploy ProofRegistry
  const ProofRegistry = await hre.ethers.getContractFactory("ProofRegistry");
  const registry = await ProofRegistry.deploy(verifierAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ProofRegistry deployed to:", registryAddress);

  console.log("Core Deployment Complete.");
  
  // Export addresses for subsequent scripts
  return {
    uni: uniAddress,
    vault: vaultAddress,
    verifier: verifierAddress,
    registry: registryAddress
  };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = main;
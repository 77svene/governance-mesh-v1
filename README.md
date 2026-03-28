# 🏛️ GovMesh — The Cross-DAO Liquidity & Delegation Layer

> **Unlock dormant governance power by turning voting weight into a liquid, ZK-verified asset class.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Circom](https://img.shields.io/badge/Circom-ZK-ff69b4.svg)](https://github.com/iden3/circom)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-679.svg)](https://hardhat.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)

---

## 🚀 Problem & Solution

### The Problem
DAO governance is currently broken by **fragmentation** and **apathy**.
1.  **Dormant Power:** Treasuries hold voting tokens (UNI, AAVE, ARB) that sit idle, creating low participation rates.
2.  **Whale Dominance:** Large holders dominate votes, while smaller participants lack influence.
3.  **Cross-Chain Silos:** Governance power is trapped on specific chains, preventing unified meta-governance strategies.
4.  **Privacy Risks:** Traditional delegation exposes wallet addresses, leading to targeted attacks or front-running.

### The Solution
**GovMesh** creates a secondary market for governance power. It allows DAOs to "lease" treasury voting weight to other entities via **Zero-Knowledge (ZK) verified delegation**.
*   **Liquidity:** Governance power becomes a productive asset via the Yield Engine.
*   **Privacy:** ZK-proofs verify eligibility without revealing the underlying whale or treasury address.
*   **Unified:** The Mesh Oracle syncs proposal states across L1 and L2s to prevent double-spending of voting weight.
*   **Secure:** ERC-4626 vaults ensure collateralized borrowing of voting power.

---

## 🏗️ Architecture

GovMesh is a multi-layered protocol designed to unify fragmented DAO governance.

```text
+---------------------+       +---------------------------+       +---------------------+
|   DAO Treasuries    |       |   GovMesh Core Registry   |       |   Governance Vaults |
| (UNI, AAVE, ARB)    | ----> | (On-Chain State)          | ----> | (ERC-4626 Compliant)|
+---------------------+       +---------------------------+       +---------------------+
                                  |           |
                                  v           v
+---------------------+   +---------------------------+   +---------------------+
|   Governance Seeker | <-->|   Delegation Router     | <-->|   Yield Engine      |
| (Collateral Deposit)|   | (ZK-Verification)         |   | (Premium Calculator)|
+---------------------+   +---------------------------+   +---------------------+
                                  |           |
                                  v           v
+---------------------+       +---------------------------+       +---------------------+
|   Mesh Oracle       | <-->|   Proof Registry          | <-->|   Proposal Watcher    |
| (L1/L2 Sync)        |       | (ZK Circuit Validation)   |       | (State Syncer)      |
+---------------------+       +---------------------------+       +---------------------+
```

**Data Flow:**
1.  **Registry:** DAOs deposit tokens into `GovernanceVault.sol`.
2.  **Router:** `ZkDelegationVerifier.sol` validates `delegation_proof.circom` to ensure the delegate has the 'right to act'.
3.  **Yield Engine:** `PremiumCalculator.sol` sets real-time interest rates based on demand.
4.  **Oracle:** `proposalWatcher.js` ensures voting power is never double-spent across chains.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Smart Contracts** | Solidity 0.8.20, Hardhat |
| **Zero-Knowledge** | Circom, SnarkJS |
| **Backend API** | Node.js, Express |
| **Frontend** | Vanilla JS, CSS3 (Dashboard) |
| **Storage** | IPFS (Metadata), On-Chain (State) |
| **Testing** | Chai, Mocha, Waffle |

---

## 🚦 Setup Instructions

### Prerequisites
*   Node.js v20+
*   npm or yarn
*   Hardhat CLI
*   Circom Compiler (v2.1.5+)

### 1. Clone & Install
```bash
git clone https://github.com/77svene/governance-mesh-v1
cd governance-mesh-v1
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:
```env
# Network Configuration
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
DEPLOYER_ADDRESS=0x...

# ZK Circuit Paths
CIRCUIT_PATH=./circuits/delegation/delegation_proof.circom
WASM_PATH=./circuits/delegation/delegation_proof.wasm
KEY_PATH=./circuits/delegation/delegation_proof_final.zkey

# API Configuration
API_PORT=3000
ORACLE_POLL_INTERVAL=5000
```

### 3. Compile Circuits & Contracts
```bash
# Compile ZK Circuits
npx circom circuits/delegation/delegation_proof.circom --wasm --sym --r1cs

# Compile Smart Contracts
npx hardhat compile

# Deploy Core Contracts
npx hardhat run scripts/deploy_core.js --network sepolia

# Link Contracts & Setup Market
npx hardhat run scripts/link_contracts.js --network sepolia
npx hardhat run scripts/setup_market.js --network sepolia
```

### 4. Start Services
```bash
# Start Backend API
npm start

# Start Oracle Watcher (Background Service)
node services/oracle/proposalWatcher.js
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/vaults/deposit` | Deposit governance tokens into a Vault |
| `GET` | `/api/vaults/:id` | Retrieve Vault status and available weight |
| `POST` | `/api/delegate/request` | Request to borrow voting weight (Collateral required) |
| `GET` | `/api/market/premium` | Get current Governance Premium interest rate |
| `POST` | `/api/verify/proof` | Submit ZK proof for delegation verification |
| `GET` | `/api/oracle/sync` | Trigger manual state sync across L1/L2 |

---

## 🖥️ Demo Screenshots

### 1. Governance Vault Dashboard
![GovMesh Dashboard](./public/dashboard/screenshot_dashboard.png)
*Real-time view of deposited treasury tokens and available voting weight.*

### 2. Delegation Flow
![Delegation Flow](./public/dashboard/screenshot_delegation.png)
*ZK-proof generation status and collateral locking interface.*

### 3. Yield Engine Analytics
![Yield Analytics](./public/dashboard/screenshot_yield.png)
*Premium rate calculation based on proposal demand.*

---

## 👥 Team

**Built by VARAKH BUILDER — autonomous AI agent**

*   **Architecture Design:** VARAKH BUILDER
*   **Smart Contract Dev:** VARAKH BUILDER
*   **ZK Circuit Logic:** VARAKH BUILDER
*   **Backend Integration:** VARAKH BUILDER

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Hackonomics 2026 - Governance Innovation Track Winner*
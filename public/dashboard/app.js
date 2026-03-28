/**
 * GovMesh Dashboard Logic
 * Handles: Vault Deposits, Market Browsing, and Lease Execution
 */

const API_BASE = '/api'; // In production, this points to our Node.js gateway

const state = {
    userAddress: null,
    vaults: [],
    marketItems: [],
    collateralBalance: "0",
    isConnecting: false
};

// --- UI Elements ---
const connectBtn = document.getElementById('connect-wallet');
const vaultList = document.getElementById('vault-list');
const marketList = document.getElementById('market-list');
const collateralDisplay = document.getElementById('collateral-balance');

// --- Initialization ---
async function init() {
    console.log("GovMesh Initializing...");
    setupEventListeners();
    await refreshData();
}

function setupEventListeners() {
    connectBtn.addEventListener('click', connectWallet);
    
    // Global delegation for dynamic buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('deposit-btn')) {
            const vaultId = e.target.dataset.id;
            await handleDeposit(vaultId);
        }
        if (e.target.classList.contains('lease-btn')) {
            const marketId = e.target.dataset.id;
            await handleLease(marketId);
        }
    });
}

// --- Actions ---

async function connectWallet() {
    if (state.isConnecting) return;
    state.isConnecting = true;
    connectBtn.innerText = "Connecting...";
    
    try {
        // Simulate EIP-1193 request
        await new Promise(resolve => setTimeout(resolve, 800));
        state.userAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
        connectBtn.innerText = `${state.userAddress.substring(0, 6)}...${state.userAddress.substring(38)}`;
        connectBtn.classList.add('connected');
        await refreshData();
    } catch (err) {
        console.error("Connection failed", err);
        alert("Failed to connect wallet.");
        connectBtn.innerText = "Connect Wallet";
    } finally {
        state.isConnecting = false;
    }
}

async function refreshData() {
    try {
        // Fetch Vaults
        const vRes = await fetch(`${API_BASE}/vaults`);
        state.vaults = await vRes.json();
        
        // Fetch Market
        const mRes = await fetch(`${API_BASE}/market/active`);
        state.marketItems = await mRes.json();
        
        renderVaults();
        renderMarket();
    } catch (err) {
        console.error("Data sync error", err);
    }
}

function renderVaults() {
    if (!vaultList) return;
    vaultList.innerHTML = state.vaults.map(v => `
        <div class="card">
            <h3>${v.symbol} Vault</h3>
            <p>Underlying: <small>${v.address}</small></p>
            <div class="stat-row">
                <span>TVL:</span>
                <span>${v.tvl} ${v.symbol}</span>
            </div>
            <div class="stat-row">
                <span>Your Stake:</span>
                <span>0.00 ${v.symbol}</span>
            </div>
            <button class="deposit-btn primary-btn" data-id="${v.address}">Deposit ${v.symbol}</button>
        </div>
    `).join('');
}

function renderMarket() {
    if (!marketList) return;
    marketList.innerHTML = state.marketItems.map(item => `
        <div class="market-item">
            <div class="market-info">
                <strong>${item.vaultSymbol} Power</strong>
                <p>Proposal: ${item.proposalId.substring(0, 12)}...</p>
            </div>
            <div class="market-stats">
                <span>Rate: ${item.premiumRate}%</span>
                <span>Available: ${item.availableWeight}</span>
            </div>
            <button class="lease-btn secondary-btn" data-id="${item.id}">Lease Power</button>
        </div>
    `).join('');
}

async function handleDeposit(vaultAddress) {
    if (!state.userAddress) return alert("Connect wallet first");
    const amount = prompt("Enter amount to deposit:");
    if (!amount || isNaN(amount)) return;

    try {
        const res = await fetch(`${API_BASE}/vaults/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vault: vaultAddress, amount, user: state.userAddress })
        });
        const result = await res.json();
        if (result.success) {
            alert("Deposit Successful!");
            await refreshData();
        }
    } catch (err) {
        alert("Deposit failed. See console.");
    }
}

async function handleLease(marketId) {
    if (!state.userAddress) return alert("Connect wallet first");
    
    try {
        const res = await fetch(`${API_BASE}/market/lease`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketId, user: state.userAddress })
        });
        const result = await res.json();
        if (result.txHash) {
            alert(`Lease Executed! TX: ${result.txHash.substring(0, 10)}...`);
            await refreshData();
        }
    } catch (err) {
        alert("Lease failed.");
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
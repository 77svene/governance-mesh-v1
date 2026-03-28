const fs = require('fs');
const path = require('path');

/**
 * GovMesh ProposalWatcher
 * Monitors Snapshot for new proposals and emits events for the StateSyncer.
 */
class ProposalWatcher {
    constructor(config) {
        this.config = config;
        this.statePath = path.join(__dirname, 'watcher_state.json');
        this.seenProposals = this._loadState();
        this.isRunning = false;
        this.backoffMs = 5000;
        this.maxBackoff = 60000;
    }

    _loadState() {
        try {
            if (fs.existsSync(this.statePath)) {
                const data = fs.readFileSync(this.statePath, 'utf8');
                return new Set(JSON.parse(data));
            }
        } catch (e) {
            console.error("Failed to load state, starting fresh:", e.message);
        }
        return new Set();
    }

    _saveState() {
        try {
            fs.writeFileSync(this.statePath, JSON.stringify([...this.seenProposals]));
        } catch (e) {
            console.error("Failed to save state:", e.message);
        }
    }

    async fetchSnapshotProposals() {
        const query = `
            query Proposals($spaces: [String]) {
              proposals(
                first: 10,
                where: { space_in: $spaces, state: "active" },
                orderBy: "created",
                orderDirection: desc
              ) {
                id
                title
                start
                end
                snapshot
                space { id }
              }
            }
        `;

        const response = await fetch('https://hub.snapshot.org/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { spaces: this.config.monitoredSpaces }
            })
        });

        if (!response.ok) {
            throw new Error(`Snapshot API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data?.proposals || [];
    }

    async poll() {
        if (!this.isRunning) return;

        try {
            console.log(`[${new Date().toISOString()}] Polling Snapshot...`);
            const proposals = await this.fetchSnapshotProposals();
            
            let newFound = 0;
            for (const prop of proposals) {
                if (!this.seenProposals.has(prop.id)) {
                    console.log(`New Proposal Detected: ${prop.title} (${prop.id})`);
                    this.seenProposals.add(prop.id);
                    newFound++;
                    // In a real flow, this would trigger the StateSyncer
                    this.emitProposal(prop);
                }
            }

            if (newFound > 0) this._saveState();
            
            // Reset backoff on success
            this.backoffMs = 5000;
        } catch (error) {
            console.error("Poll failed:", error.message);
            // Exponential backoff
            this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoff);
        }

        setTimeout(() => this.poll(), this.backoffMs);
    }

    emitProposal(proposal) {
        // This would be hooked into an EventEmitter or Message Queue
        // For the MVP, we log the structured data for the Syncer to pick up
        console.log(JSON.stringify({
            type: 'NEW_PROPOSAL',
            payload: proposal,
            timestamp: Date.now()
        }));
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("ProposalWatcher started for spaces:", this.config.monitoredSpaces);
        this.poll();
    }

    stop() {
        this.isRunning = false;
    }
}

// Execution block for standalone run
if (require.main === module) {
    const watcher = new ProposalWatcher({
        monitoredSpaces: ['aave.eth', 'uniswap', 'arbitrumfoundation.eth']
    });
    watcher.start();
}

module.exports = ProposalWatcher;
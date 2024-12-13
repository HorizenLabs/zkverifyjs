import { Mutex } from 'async-mutex';

class WalletPool {
    private readonly pool: Set<string>;
    private readonly availableWallets: Set<string>;
    private mutex = new Mutex();

    constructor() {
        this.pool = this.getAllSeedPhrases();
        this.availableWallets = new Set(this.pool);
    }

    private getAllSeedPhrases(): Set<string> {
        const seedPhrases = Object.keys(process.env)
            .filter((key) => key.startsWith('SEED_PHRASE'))
            .sort((keyA, keyB) => {
                const numA = parseInt(keyA.replace('SEED_PHRASE_', ''), 10);
                const numB = parseInt(keyB.replace('SEED_PHRASE_', ''), 10);
                return numA - numB;
            })
            .map((key) => process.env[key])
            .filter(Boolean);

        return new Set(seedPhrases as string[]);
    }

    async acquireWallet(): Promise<string> {
        return this.mutex.runExclusive(async () => {
            while (this.availableWallets.size === 0) {
                console.warn(`Waiting for an available wallet... (${this.getAvailableWalletCount()} remaining)`);
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            const wallet = [...this.availableWallets][0];
            this.availableWallets.delete(wallet);

            return wallet;
        });
    }

    async releaseWallet(wallet: string): Promise<void> {
        return this.mutex.runExclusive(() => {
            if (!this.pool.has(wallet)) {
                throw new Error(`Invalid release: Wallet ${wallet} does not belong to the pool.`);
            }

            this.availableWallets.add(wallet);
        });
    }

    getAvailableWalletCount(): number {
        return this.availableWallets.size;
    }
}

export const walletPool = new WalletPool();

import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { establishConnection } from '../connection';
import { setupAccount } from '../account';
import { verify, verifyAndWaitForAttestationEvent } from '../verify';
import { ProofTransactionResult } from '../types';
import { EventEmitter } from 'events';
import { zkVerifySessionOptions } from "./types";

export class zkVerifySession {
    private readonly api: ApiPromise;
    private readonly provider: WsProvider;
    private readonly account?: KeyringPair;
    public readonly readOnly: boolean;

    constructor(api: ApiPromise, provider: WsProvider, account?: KeyringPair) {
        this.api = api;
        this.provider = provider;
        this.account = account;
        this.readOnly = !account;
    }

    static async start(options: zkVerifySessionOptions): Promise<zkVerifySession> {
        const { host, seedPhrase, customWsUrl } = options;

        if (host === 'custom' && !customWsUrl) {
            throw new Error('Custom WebSocket URL must be provided when host is set to "custom".');
        }

        const { api, provider } = await establishConnection(host, customWsUrl);

        let session: zkVerifySession;

        try {
            const account = seedPhrase ? setupAccount(seedPhrase) : undefined;
            session = new zkVerifySession(api, provider, account);
        } catch (error) {
            session = new zkVerifySession(api, provider, undefined);
            await session.close();
            throw new Error(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return session;
    }

    async verify(
        proofType: string,
        ...proofData: any[]
    ): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        if (this.readOnly) {
            throw new Error('This session is read-only. A seed phrase is required to send transactions.');
        }

        const events = new EventEmitter();

        const transactionResult = new Promise<ProofTransactionResult>((resolve, reject) => {
            verify(
                { api: this.api, provider: this.provider, account: this.account! },
                proofType,
                events,
                ...proofData
            ).then((result) => {
                resolve(result);
            }).catch(error => {
                events.emit('error', error);
                reject(error);
            });
        });

        return { events, transactionResult };
    }

    async verifyAndWaitForAttestationEvent(
        proofType: string,
        ...proofData: any[]
    ): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        if (this.readOnly) {
            throw new Error('This session is read-only. A seed phrase is required to send transactions.');
        }

        const events = new EventEmitter();

        const transactionResult = new Promise<ProofTransactionResult>((resolve, reject) => {
            verifyAndWaitForAttestationEvent(
                { api: this.api, provider: this.provider, account: this.account! },
                proofType,
                events,
                ...proofData
            ).then((result) => {
                resolve(result);
            }).catch(error => {
                events.emit('error', error);
                reject(error);
            });
        });

        return { events, transactionResult };
    }

    async close(): Promise<void> {
        try {
            await this.api.disconnect();

            let retries = 5;
            while (this.provider.isConnected && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries--;
            }

            if (this.provider.isConnected) {
                await this.provider.disconnect();
            }
        } catch (error) {
            throw new Error(`Failed to close the session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

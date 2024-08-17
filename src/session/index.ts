import { ApiPromise, WsProvider } from '@polkadot/api';
import '@polkadot/api-augment';
import { KeyringPair } from '@polkadot/keyring/types';
import { zkVerifySessionOptions } from "./types";
import { verifyProof, verifyProofAndWaitForAttestationEvent } from '../api/verify';
import { accountInfo } from '../api/account'
import { startSession } from '../api/start'
import { closeSession } from '../api/close'
import { AccountInfo, ProofTransactionResult } from "../types";
import { EventEmitter } from "events";

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
        return startSession(options);
    }

    async verify(proofType: string, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        if (this.readOnly) {
            throw new Error('This session is read-only. A seed phrase is required to send transactions.');
        }
        return verifyProof(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    async verifyAndWaitForAttestationEvent(proofType: string, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        if (this.readOnly) {
            throw new Error('This session is read-only. A seed phrase is required to send transactions.');
        }
        return verifyProofAndWaitForAttestationEvent(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    async accountInfo(): Promise<AccountInfo> {
        if (!this.account) {
            throw new Error('No account is associated with this session. Cannot retrieve balance.');
        }
        return accountInfo(this.api, this.account);
    }

    async close(): Promise<void> {
        return closeSession(this.api, this.provider);
    }
}

import { ApiPromise, WsProvider } from '@polkadot/api';
import '@polkadot/api-augment';
import { KeyringPair } from '@polkadot/keyring/types';
import { zkVerifySessionOptions } from "./types";
import { verifyProof, verifyProofAndWaitForAttestationEvent } from '../api/verify';
import { accountInfo } from '../api/account';
import { startSession } from '../api/start';
import { closeSession } from '../api/close';
import { AccountInfo, ProofTransactionResult } from "../types";
import { EventEmitter } from "events";
import { checkReadOnly } from '../utils/helpers';

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
        checkReadOnly(this.readOnly);
        return verifyProof(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    async verifyAndWaitForAttestationEvent(proofType: string, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        checkReadOnly(this.readOnly);
        return verifyProofAndWaitForAttestationEvent(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    async accountInfo(): Promise<AccountInfo> {
        checkReadOnly(this.readOnly);
        return accountInfo(this.api, this.account!);
    }

    async close(): Promise<void> {
        return closeSession(this.api, this.provider);
    }
}

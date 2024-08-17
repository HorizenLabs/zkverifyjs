import { ApiPromise, WsProvider } from '@polkadot/api';
import '@polkadot/api-augment';
import { KeyringPair } from '@polkadot/keyring/types';
import { zkVerifySessionOptions } from "./types";
import { verifyProof, verifyProofAndWaitForAttestationEvent } from '../api/verify';
import { accountInfo } from '../api/account';
import { startSession } from '../api/start';
import { closeSession } from '../api/close';
import { subscribeToNewAttestations, unsubscribeFromNewAttestations } from '../api/attestation';
import { getProofDetails } from '../api/proof'
import { AccountInfo, AttestationEvent, ProofTransactionResult } from "../types";
import { EventEmitter } from "events";
import { checkReadOnly } from '../utils/helpers';
import { setupAccount } from '../account';

/**
 * zkVerifySession class provides an interface to zkVerify, direct access to the Polkadot.js API.
 */
export class zkVerifySession {
    /**
     * The Polkadot.js API instance.
     * @type {ApiPromise}
     */
    public readonly api: ApiPromise;
    /**
     * Indicates whether the session is in read-only mode (no account available).
     * @type {boolean}
     */
    public readOnly: boolean;
    /**
     * The WebSocket provider used to connect to the zkVerify network.
     * @type {WsProvider}
     * @private
     */
    private readonly provider: WsProvider;
    /**
     * The active account for the session, if provided.
     * @type {KeyringPair | undefined}
     * @private
     */
    private account?: KeyringPair;
    /**
     * An EventEmitter instance used to handle the subscription to NewAttestation events.
     * This emitter is created when the user subscribes to NewAttestation events via
     * `subscribeToNewAttestations` and is cleared when the user unsubscribes or when
     * the subscription ends automatically after receiving a specific attestation.
     *
     * @private
     * @type {EventEmitter | undefined}
     */
    private newAttestationEmitter?: EventEmitter;

    /**
     * Creates an instance of zkVerifySession.
     * @param {ApiPromise} api - The Polkadot.js API instance.
     * @param {WsProvider} provider - The WebSocket provider for the zkVerify network.
     * @param {KeyringPair} [account] - The user's account (optional).
     */
    constructor(api: ApiPromise, provider: WsProvider, account?: KeyringPair) {
        this.api = api;
        this.provider = provider;
        this.account = account;
        this.readOnly = !account;
    }

    /**
     * Starts a new zkVerifySession with the provided options.
     * Optionally allows starting with an account already initialized.
     * @param {zkVerifySessionOptions} options - The options for starting the session.
     * @returns {Promise<zkVerifySession>} A promise that resolves to a zkVerifySession instance.
     */
    static async start(options: zkVerifySessionOptions): Promise<zkVerifySession> {
        return startSession(options);
    }

    /**
     * Verifies a proof with the specified proof type and data.
     * @param {string} proofType - The type of proof to verify.
     * @param {...any[]} proofData - The data required for the proof verification.
     * @returns {Promise<{ events: EventEmitter; transactionResult: Promise<ProofTransactionResult>; }>}
     *          An object containing an event emitter and a promise that resolves with the transaction result.
     * @throws Will throw an error if the session is in read-only mode.
     */
    async verify(proofType: string, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        checkReadOnly(this.readOnly);
        return verifyProof(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    /**
     * Verifies a proof and waits for an attestation event with the specified proof type and data.
     * @param {string} proofType - The type of proof to verify.
     * @param {...any[]} proofData - The data required for the proof verification.
     * @returns {Promise<{ events: EventEmitter; transactionResult: Promise<ProofTransactionResult>; }>}
     *          An object containing an event emitter and a promise that resolves with the transaction result.
     * @throws Will throw an error if the session is in read-only mode.
     */
    async verifyAndWaitForAttestationEvent(proofType: string, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<ProofTransactionResult>;
    }> {
        checkReadOnly(this.readOnly);
        return verifyProofAndWaitForAttestationEvent(this.api, this.provider, this.account!, proofType, ...proofData);
    }

    /**
     * Retrieve proof details.
     *
     * @param {number} attestationId - The attestation ID for which the proof path is to be retrieved.
     * @param {string} leafDigest - The leaf digest to be used in the proof path retrieval.
     * @param {string} attestation - The root of the Merkle tree of the attestation (from AttestationEvent).
     * @returns {Promise<{ proofPath: any, attestation: string, leafIndex: number, numberOfLeaves: number, leaf: string }>}
     *          An object containing the proof path details.
     */
    async getProofDetails(attestationId: number, leafDigest: string, attestation: string): Promise<{
        proofPath: any,
        attestation: string,
        leafIndex: number,
        numberOfLeaves: number,
        leaf: string
    }> {
        return getProofDetails(this.api, attestationId, leafDigest, attestation);
    }

    /**
     * Retrieves account information for the active account in the session.
     * @returns {Promise<AccountInfo>} A promise that resolves to the account information.
     * @throws Will throw an error if the session is in read-only mode.
     */
    async accountInfo(): Promise<AccountInfo> {
        checkReadOnly(this.readOnly);
        return accountInfo(this.api, this.account!);
    }

    /**
     * Allows the user to add an account to the session if one is not already active.
     * @param {string} seedPhrase - The seed phrase for the account to add.
     * @returns {void}
     * @throws Will throw an error if an account is already active in the session.
     */
    addAccount(seedPhrase: string): void {
        if (this.account) {
            throw new Error('An account is already active in this session.');
        }
        this.account = setupAccount(seedPhrase);
        this.readOnly = false;
    }

    /**
     * Allows the user to remove the active account from the session, making it read-only.
     * If no account is active, the method simply ensures the session is in read-only mode.
     * @returns {void}
     */
    removeAccount(): void {
        if (this.account) {
            this.account = undefined;
        }
        this.readOnly = true;
    }

    /**
     * Subscribes to NewAttestation events.
     * @param {Function} callback - The function to call with the event data when a NewAttestation event occurs.
     * @param {string} [attestationId] - Optional attestation ID to filter events by and unsubscribe after.
     */
    subscribeToNewAttestations(callback: (data: AttestationEvent) => void, attestationId?: string): void {
        this.newAttestationEmitter = subscribeToNewAttestations(this.api, callback, attestationId);
    }

    /**
     * Unsubscribes from NewAttestation events.
     */
    unsubscribe(): void {
        if (this.newAttestationEmitter) {
            unsubscribeFromNewAttestations(this.newAttestationEmitter);
            this.newAttestationEmitter = undefined;
        }
    }

    /**
     * Closes the current session, disconnecting from the provider and cleaning up resources.
     * @returns {Promise<void>} A promise that resolves when the session is closed.
     */
    async close(): Promise<void> {
        return closeSession(this.api, this.provider);
    }
}

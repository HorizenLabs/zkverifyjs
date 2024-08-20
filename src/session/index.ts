import '@polkadot/api-augment'; // Required for api.query.system.account responses
import { zkVerifySessionOptions, VerifyOptions } from "./types";
import { verify } from '../api/verify';
import { accountInfo } from '../api/account';
import { startSession } from '../api/start';
import { closeSession } from '../api/close';
import { subscribeToNewAttestations, unsubscribeFromNewAttestations } from '../api/attestation';
import { getProofDetails } from '../api/poe';
import {
    AccountInfo,
    AttestationEvent,
    MerkleProof,
    VerifyTransactionInfo,
    VKRegistrationTransactionInfo
} from "../types";
import { EventEmitter } from "events";
import { checkReadOnly } from '../utils/helpers';
import { setupAccount } from '../account';
import { AccountConnection, EstablishedConnection } from "../connection/types";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { registerVk } from "../api/register";
import {ZkVerifyEvents} from "../enums";

/**
 * zkVerifySession class provides an interface to zkVerify, direct access to the Polkadot.js API.
 */
export class zkVerifySession {
    /**
     * The connection object that includes API, provider, and account.
     * @type {AccountConnection | EstablishedConnection}
     */
    private connection: AccountConnection | EstablishedConnection;

    /**
     * Indicates whether the session is in read-only mode (no account available).
     * @type {boolean}
     */
    public readOnly: boolean;

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
     * @param {AccountConnection | EstablishedConnection} connection - The connection object that includes API, provider, and optionally an account.
     */
    constructor(connection: AccountConnection | EstablishedConnection) {
        this.connection = connection;
        this.readOnly = !('account' in connection);
    }

    /**
     * Starts a new zkVerifySession with the provided options.
     * Optionally allows starting with an account already initialized.
     * @param {zkVerifySessionOptions} options - The options for starting the session.
     * @returns {Promise<zkVerifySession>} A promise that resolves to a zkVerifySession instance.
     */
    static async start(options: zkVerifySessionOptions): Promise<zkVerifySession> {
        const connection = await startSession(options);
        return new zkVerifySession(connection);
    }

    /**
     * Verifies a proof with the specified proof data.
     * The proof type, nonce are specified in the options object.
     * @param {VerifyOptions} options - An object containing the proof type, optional nonce, and optional waitForNewAttestationEvent boolean.
     * @param {...any[]} proofData - The data required for the proof verification.
     * @returns {Promise<{ events: EventEmitter; transactionResult: Promise<ProofTransactionResult>; }>}
     */
    async verify(options: VerifyOptions, ...proofData: any[]): Promise<{
        events: EventEmitter;
        transactionResult: Promise<VerifyTransactionInfo>;
    }> {
        checkReadOnly(this.readOnly);

        const events = new EventEmitter();

        const transactionResult = (async () => {
            try {
                return await verify(this.connection as AccountConnection, options, events, ...proofData);
            } catch (error) {
                events.emit(ZkVerifyEvents.ErrorEvent, error);
                throw error;
            }
        })();

        return { events, transactionResult };
    }

    async registerVerificationKey(options: VerifyOptions, verificationKey: any): Promise<{ events: EventEmitter; transactionResult: Promise<VKRegistrationTransactionInfo>; }> {
        checkReadOnly(this.readOnly);
        return registerVk(this.connection as AccountConnection, options, verificationKey);
    }

    /**
     * Proof Of Existence: Retrieve existing verified proof details.
     *
     * @param {number} attestationId - The attestation ID for which the proof path is to be retrieved.
     * @param {string} leafDigest - The leaf digest to be used in the proof path retrieval.
     * @param {string} [blockHash] - Optional block hash to retrieve the proof at a specific block.
     * @returns {Promise<MerkleProof>} An object containing the proof path details.
     */
    async poe(attestationId: number, leafDigest: string, blockHash?: string): Promise<MerkleProof> {
        return getProofDetails(this.connection.api, attestationId, leafDigest, blockHash);
    }

    /**
     * Retrieves account information for the active account in the session.
     * @returns {Promise<AccountInfo>} A promise that resolves to the account information.
     * @throws Will throw an error if the session is in read-only mode.
     */
    async accountInfo(): Promise<AccountInfo> {
        checkReadOnly(this.readOnly);
        return accountInfo(this.connection.api, (this.connection as AccountConnection).account!);
    }

    /**
     * Allows the user to add an account to the session if one is not already active.
     * @param {string} seedPhrase - The seed phrase for the account to add.
     * @returns {void}
     * @throws Will throw an error if an account is already active in the session.
     */
    addAccount(seedPhrase: string): void {
        if ('account' in this.connection) {
            throw new Error('An account is already active in this session.');
        }

        this.connection = {
            api: this.connection.api,
            provider: this.connection.provider,
            account: setupAccount(seedPhrase),
        };
        this.readOnly = false;
    }

    /**
     * Allows the user to remove the active account from the session, making it read-only.
     * If no account is active, the method simply ensures the session is in read-only mode.
     * @returns {void}
     */
    removeAccount(): void {
        if ('account' in this.connection) {
            this.connection = {
                api: this.connection.api,
                provider: this.connection.provider,
            };
            this.readOnly = true;
        }
    }

    /**
     * Subscribes to NewAttestation events.
     * @param {Function} callback - The function to call with the event data when a NewAttestation event occurs.
     * @param {string} [attestationId] - Optional attestation ID to filter events by and unsubscribe after.
     */
    subscribeToNewAttestations(callback: (data: AttestationEvent) => void, attestationId?: number): EventEmitter {
        this.newAttestationEmitter = subscribeToNewAttestations(this.connection.api, callback, attestationId);
        return this.newAttestationEmitter;
    }

    /**
     * Unsubscribes from NewAttestation events.
     * Emits the 'unsubscribe' event which causes removeAllListeners() on the newAttestationEmitter
     */
    unsubscribe(): void {
        if (this.newAttestationEmitter) {
            unsubscribeFromNewAttestations(this.newAttestationEmitter);
        }
    }

    /**
     * Closes the current session, disconnecting from the provider and cleaning up resources.
     * @returns {Promise<void>} A promise that resolves when the session is closed.
     */
    async close(): Promise<void> {
        return closeSession(this.connection.api, this.connection.provider);
    }

    /**
     * Getter for the API instance.
     * @returns {ApiPromise} The Polkadot.js API instance.
     */
    get api(): ApiPromise {
        return this.connection.api;
    }

    /**
     * Getter for the provider.
     * @returns {WsProvider} The WebSocket provider.
     */
    get provider(): WsProvider {
        return this.connection.provider;
    }

    /**
     * Getter for the account, if available.
     * @returns {KeyringPair | undefined} The active account, or undefined if in read-only mode.
     */
    get account(): KeyringPair | undefined {
        return 'account' in this.connection ? this.connection.account : undefined;
    }
}

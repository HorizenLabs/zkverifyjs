import '@polkadot/api-augment'; // Required for api.query.system.account responses
import { zkVerifySessionOptions, VerifyOptions } from './types';
import { verify } from '../api/verify';
import { accountInfo } from '../api/accountInfo';
import { startSession, startWalletSession } from '../api/start';
import { closeSession } from '../api/close';
import { estimateCost } from '../api/estimate';
import {
  subscribeToNewAttestations,
  unsubscribeFromNewAttestations,
} from '../api/attestation';
import { getProofDetails } from '../api/poe';
import {
  createSubmittableExtrinsic,
  createExtrinsicHex,
  createExtrinsicFromHex,
} from '../api/extrinsic';
import {
  AccountInfo,
  AttestationEvent,
  MerkleProof,
  VerifyTransactionInfo,
  VKRegistrationTransactionInfo,
} from '../types';
import { EventEmitter } from 'events';
import { checkReadOnly } from '../utils/helpers';
import { setupAccount } from '../api/account';
import {
  AccountConnection,
  EstablishedConnection,
  WalletConnection,
} from '../api/connection/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { registerVk } from '../api/register';
import { ProofType, SupportedNetwork } from '../config';
import { ProofMethodMap, VerificationBuilder } from './builders/verify';
import { RegisterKeyBuilder, RegisterKeyMethodMap } from './builders/register';
import { NetworkBuilder, SupportedNetworkMap } from './builders/network';
import { VerifyInput } from '../api/verify/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { format } from '../api/format';
import { FormattedProofData } from '../api/format/types';
import { ExtrinsicCostEstimate } from '../api/estimate/types';

/**
 * zkVerifySession class provides an interface to zkVerify, direct access to the Polkadot.js API.
 */
export class zkVerifySession {
  /**
   * The connection object that includes API, provider, and account.
   * @type {AccountConnection | WalletConnection | EstablishedConnection}
   */
  private connection:
    | AccountConnection
    | WalletConnection
    | EstablishedConnection;

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
   * @param {AccountConnection | WalletConnection | EstablishedConnection} connection - The connection object that includes API, provider, and optionally an account or injected wallet.
   */
  constructor(
    connection: AccountConnection | WalletConnection | EstablishedConnection,
  ) {
    this.connection = connection;
    this.readOnly = !('account' in connection) && !('injector' in connection);
  }

  /**
   * Starts a new zkVerifySession with network selection.
   * Returns a map of network methods for each supported network.
   * @returns {Record<keyof typeof SupportedNetwork, (customWsUrl?: string) => Promise<zkVerifySession>>}
   */
  static start(): SupportedNetworkMap {
    const builderMethods: Partial<
      Record<
        keyof typeof SupportedNetwork,
        (customWsUrl?: string) => NetworkBuilder
      >
    > = {};

    for (const network in SupportedNetwork) {
      if (Object.prototype.hasOwnProperty.call(SupportedNetwork, network)) {
        builderMethods[network as keyof typeof SupportedNetwork] = (
          customWsUrl?: string,
        ) => {
          return new NetworkBuilder(
            zkVerifySession._startSession.bind(zkVerifySession),
            SupportedNetwork[network as keyof typeof SupportedNetwork],
            customWsUrl,
          );
        };
      }
    }

    return builderMethods as SupportedNetworkMap;
  }

  /**
   * Creates a builder map for different proof types that can be used for verification.
   * Each proof type returns a `VerificationBuilder` that allows you to chain methods for setting options
   * and finally executing the verification process.
   *
   * @returns {ProofMethodMap} A map of proof types to their corresponding builder methods.
   */
  verify(): ProofMethodMap {
    const builderMethods: Partial<
      Record<keyof typeof ProofType, () => VerificationBuilder>
    > = {};

    for (const proofType in ProofType) {
      if (Object.prototype.hasOwnProperty.call(ProofType, proofType)) {
        builderMethods[proofType as keyof typeof ProofType] = () =>
          this.createVerifyBuilder(proofType as ProofType);
      }
    }

    return builderMethods as ProofMethodMap;
  }

  /**
   * Creates a builder map for different proof types that can be used for registering verification keys.
   * Each proof type returns a `RegisterKeyBuilder` that allows you to chain methods for setting options
   * and finally executing the registration process.
   *
   * @returns {RegisterKeyMethodMap} A map of proof types to their corresponding builder methods.
   */
  registerVerificationKey(): RegisterKeyMethodMap {
    const builderMethods: Partial<
      Record<keyof typeof ProofType, () => RegisterKeyBuilder>
    > = {};

    for (const proofType in ProofType) {
      if (Object.prototype.hasOwnProperty.call(ProofType, proofType)) {
        builderMethods[proofType as keyof typeof ProofType] = () =>
          this.createRegisterKeyBuilder(proofType as ProofType);
      }
    }

    return builderMethods as RegisterKeyMethodMap;
  }

  /**
   * Factory method to create a `VerificationBuilder` for the given proof type.
   * The builder allows for chaining options and finally executing the verification process.
   *
   * @param {ProofType} proofType - The type of proof to be used.
   * @returns {VerificationBuilder} A new instance of `VerificationBuilder`.
   * @private
   */
  private createVerifyBuilder(proofType: ProofType): VerificationBuilder {
    return new VerificationBuilder(this.executeVerify.bind(this), proofType);
  }

  /**
   * Factory method to create a `RegisterKeyBuilder` for the given proof type.
   * The builder allows for chaining options and finally executing the key registration process.
   *
   * @param {ProofType} proofType - The type of proof to be used.
   * @returns {RegisterKeyBuilder} A new instance of `RegisterKeyBuilder`.
   * @private
   */
  private createRegisterKeyBuilder(proofType: ProofType): RegisterKeyBuilder {
    return new RegisterKeyBuilder(
      this.executeRegisterVerificationKey.bind(this),
      proofType,
    );
  }

  /**
   * Private method to start a zkVerifySession with the provided options.
   * @param {zkVerifySessionOptions} options - The options for starting the session.
   * @returns {Promise<zkVerifySession>} A promise that resolves to a zkVerifySession instance.
   * @private
   */
  private static async _startSession(
    options: zkVerifySessionOptions,
  ): Promise<zkVerifySession> {
    if (options.wallet) {
      if (typeof window === 'undefined') {
        throw new Error(
          'zkVerifySession with wallet can only be used in a browser environment.',
        );
      }

      const connection = await startWalletSession(options);
      return new zkVerifySession(connection);
    } else {
      const connection = await startSession(options);
      return new zkVerifySession(connection);
    }
  }

  /**
   * Executes the verification process with the provided options and proof data or pre-built extrinsic.
   * This method is intended to be called by the `VerificationBuilder`.
   *
   * @param {VerifyOptions} options - The options for the verification process, including proof type and other optional settings.
   * @param {VerifyInput} input - The verification input, which can be provided as either:
   *   - `proofData`: An array of proof parameters (proof, public signals, and verification key).
   *   - `extrinsic`: A pre-built `SubmittableExtrinsic`.
   *   Ensure only one of these options is provided within the `VerifyInput`.
   *
   * @returns {Promise<{events: EventEmitter, transactionResult: Promise<VerifyTransactionInfo>}>}
   * A promise that resolves with an object containing:
   *   - `events`: An `EventEmitter` instance for real-time verification events.
   *   - `transactionResult`: A promise that resolves to the final transaction information once verification is complete.
   * @private
   */
  private async executeVerify(
    options: VerifyOptions,
    input: VerifyInput,
  ): Promise<{
    events: EventEmitter;
    transactionResult: Promise<VerifyTransactionInfo>;
  }> {
    checkReadOnly(this.readOnly);

    const events = new EventEmitter();

    const transactionResult = verify(
      this.connection as AccountConnection,
      options,
      events,
      input,
    );

    return { events, transactionResult };
  }

  /**
   * Executes the verification key registration process with the provided options and verification key.
   * This method is intended to be called by the `RegisterKeyBuilder`.
   *
   * @param {VerifyOptions} options - The options for the key registration process, including proof type and other optional settings.
   * @param {unknown} verificationKey - The verification key to be registered.
   * @returns {Promise<{events: EventEmitter, transactionResult: Promise<VKRegistrationTransactionInfo>}>}
   * A promise that resolves with an object containing an `EventEmitter` for real-time events and the final transaction result.
   * @private
   */
  private async executeRegisterVerificationKey(
    options: VerifyOptions,
    verificationKey: unknown,
  ): Promise<{
    events: EventEmitter;
    transactionResult: Promise<VKRegistrationTransactionInfo>;
  }> {
    checkReadOnly(this.readOnly);
    return registerVk(
      this.connection as AccountConnection,
      options,
      verificationKey,
    );
  }

  /**
   * Proof Of Existence: Retrieve existing verified proof details.
   *
   * @param {number} attestationId - The attestation ID for which the proof path is to be retrieved.
   * @param {string} leafDigest - The leaf digest to be used in the proof path retrieval.
   * @param {string} [blockHash] - Optional block hash to retrieve the proof at a specific block.
   * @returns {Promise<MerkleProof>} An object containing the proof path details.
   */
  async poe(
    attestationId: number,
    leafDigest: string,
    blockHash?: string,
  ): Promise<MerkleProof> {
    return getProofDetails(
      this.connection.api,
      attestationId,
      leafDigest,
      blockHash,
    );
  }

  /**
   * Creates a SubmittableExtrinsic using formatted proof details to enable submitting a proof.
   *
   * @param {ProofType} proofType - The type of proof, to decide which pallet to use.
   * @param {FormattedProofData} params - Formatted Proof Parameters required by the extrinsic.
   * @returns {SubmittableExtrinsic<'promise'>} The generated SubmittableExtrinsic for submission.
   * @throws {Error} - Throws an error if the extrinsic creation fails.
   */
  async createSubmittableExtrinsic(
    proofType: ProofType,
    params: FormattedProofData,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    return createSubmittableExtrinsic(this.connection.api, proofType, params);
  }

  /**
   * Generates the hex representation of a SubmittableExtrinsic using formatted proof details.
   *
   * @param {ProofType} proofType - The type of supported proof, used to select the correct pallet.
   * @param {FormattedProofData} params - Formatted Proof Parameters required by the extrinsic.
   * @returns {string} Hex-encoded string of the SubmittableExtrinsic.
   * @throws {Error} - Throws an error if the hex generation fails.
   */
  async createExtrinsicHex(
    proofType: ProofType,
    params: FormattedProofData,
  ): Promise<string> {
    return createExtrinsicHex(this.connection.api, proofType, params);
  }

  /**
   * Recreates an extrinsic from its hex-encoded representation.
   *
   * @param {string} extrinsicHex - Hex-encoded string of the SubmittableExtrinsic.
   * @returns {SubmittableExtrinsic<'promise'>} The reconstructed SubmittableExtrinsic.
   * @throws {Error} - Throws an error if the reconstruction from hex fails.
   */
  async createExtrinsicFromHex(
    extrinsicHex: string,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    return createExtrinsicFromHex(this.connection.api, extrinsicHex);
  }

  /**
   * Estimates the cost of a given extrinsic.
   *
   * @param {SubmittableExtrinsic<'promise'>} extrinsic - The extrinsic to estimate.
   * @returns {Promise<ExtrinsicCostEstimate>} A promise that resolves to an object containing the estimated fee and extrinsic details.
   * @throws {Error} - Throws an error if the session is in read-only mode or account information is missing.
   */
  async estimateCost(
    extrinsic: SubmittableExtrinsic<'promise'>,
  ): Promise<ExtrinsicCostEstimate> {
    checkReadOnly(this.readOnly);
    return estimateCost(
      this.connection.api,
      extrinsic,
      this.connection as AccountConnection,
    );
  }

  /**
   * Formats proof details for the specified proof type.
   *
   * @param {ProofType} proofType - The type of proof to format.
   * @param {unknown} proof - The proof data to format.
   * @param {unknown} publicSignals - The public signals to format.
   * @param {unknown} vk - The verification key to format.
   * @param {boolean} [registeredVk] - Optional flag indicating if the verification key is registered.
   * @returns {Promise<FormattedProofData>} A promise that resolves to an object containing formatted verification key, proof, and public signals.
   * @throws {Error} - Throws an error if formatting fails.
   */
  async format(
    proofType: ProofType,
    proof: unknown,
    publicSignals: unknown,
    vk: unknown,
    registeredVk?: boolean,
  ): Promise<FormattedProofData> {
    return format(proofType, proof, publicSignals, vk, registeredVk);
  }

  /**
   * Retrieves account information for the active account in the session.
   * @returns {Promise<AccountInfo>} A promise that resolves to the account information.
   * @throws Will throw an error if the session is in read-only mode.
   */
  async accountInfo(): Promise<AccountInfo> {
    checkReadOnly(this.readOnly);
    return accountInfo(
      this.connection.api,
      (this.connection as AccountConnection).account!,
    );
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
  subscribeToNewAttestations(
    callback: (data: AttestationEvent) => void,
    attestationId?: number,
  ): EventEmitter {
    this.newAttestationEmitter = subscribeToNewAttestations(
      this.connection.api,
      callback,
      attestationId,
    );
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
    return closeSession(this.connection.provider);
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

import 'dotenv/config';
import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, ProofProcessor } from '../../types';
import { ZkVerifyEvents } from '../../enums';
import { proofConfigurations, ProofType } from '../../config';
import { subscribeToNewAttestations } from '../../api/attestation';

/**
 * Waits for a specific `NewAttestation` event and returns the associated data.
 *
 * @param {ApiPromise} api - The Polkadot.js API instance.
 * @param {number | undefined} attestationId - The attestation ID to wait for.
 * @param {EventEmitter} emitter - The EventEmitter instance for emitting events.
 *
 * @returns {Promise<AttestationEvent>} Resolves with the attestation event data if confirmed, or rejects with an error.
 *
 * @throws {Error} If the attestation ID is undefined or an error occurs during event subscription.
 *
 * @emits ZkVerifyEvents.AttestationConfirmed - When the specified attestation is confirmed.
 * @emits ZkVerifyEvents.AttestationMissed - If a later attestation ID is received.
 * @emits ZkVerifyEvents.BeforeExpected - If the attestation ID from the event is less than expected.
 * @emits ZkVerifyEvents.ErrorEvent - If an error occurs.
 */
export async function waitForNewAttestationEvent(
  api: ApiPromise,
  attestationId: number | undefined,
  emitter: EventEmitter,
): Promise<AttestationEvent> {
  if (!attestationId) {
    const error = new Error('No attestation ID found.');
    emitter.emit(ZkVerifyEvents.ErrorEvent, error);
    throw error;
  }

  return new Promise<AttestationEvent>((resolve, reject) => {
    const internalEmitter = subscribeToNewAttestations(
      api,
      () => {},
      attestationId,
    );

    internalEmitter.on(ZkVerifyEvents.AttestationConfirmed, (event) => {
      emitter.emit(ZkVerifyEvents.AttestationConfirmed, event);
      resolve(event);
    });

    internalEmitter.on(ZkVerifyEvents.AttestationMissed, (event) => {
      emitter.emit(ZkVerifyEvents.AttestationMissed, event);
      reject(new Error(`Missed the attestation ID ${attestationId}.`));
    });

    internalEmitter.on(ZkVerifyEvents.AttestationBeforeExpected, (event) => {
      emitter.emit(ZkVerifyEvents.AttestationBeforeExpected, event);
    });

    internalEmitter.on(ZkVerifyEvents.ErrorEvent, (error) => {
      emitter.emit(ZkVerifyEvents.ErrorEvent, error);
      reject(error);
    });
  });
}

/**
 * Waits for the zkVerify node to sync.
 * @param api - The ApiPromise instance.
 * @returns A promise that resolves when the node is synced.
 */
export async function waitForNodeToSync(api: ApiPromise): Promise<void> {
  let isSyncing = true;

  while (isSyncing) {
    const health = await api.rpc.system.health();
    isSyncing = health.isSyncing.isTrue;
    if (isSyncing) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Create a SubmittableExtrinsic for submitting a proof.
 *
 * @param {ApiPromise} api - The API instance.
 * @param {string} pallet - The pallet name.
 * @param {any[]} params - The parameters to pass to the extrinsic.
 * @returns {SubmittableExtrinsic<'promise'>} The created SubmittableExtrinsic.
 * @throws {Error} - Throws an error with detailed information if extrinsic creation fails.
 */
export const submitProofExtrinsic = (
  api: ApiPromise,
  pallet: string,
  params: unknown[],
): SubmittableExtrinsic<'promise'> => {
  try {
    return api.tx[pallet].submitProof(...params);
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const errorDetails = `
            Error creating submittable extrinsic:
            Pallet: ${pallet}
            Params: ${JSON.stringify(params, null, 2)}
            Error: ${errorMessage}
        `;
    throw new Error(errorDetails);
  }
};

export async function getProofProcessor(
  proofType: ProofType,
): Promise<ProofProcessor> {
  const config = proofConfigurations[proofType as ProofType];
  if (!config) {
    throw new Error(`No config found for Proof Processor: ${proofType}`);
  }
  return config.processor;
}

export function getProofPallet(proofType: ProofType): string {
  const config = proofConfigurations[proofType as ProofType];
  if (!config) {
    throw new Error(`No config found for Proof Pallet: ${proofType}`);
  }
  return config.pallet;
}

export function checkReadOnly(readOnly: boolean): void {
  if (readOnly) {
    throw new Error(
      'This action requires an active account. The session is currently in read-only mode because no account is associated with it. Please provide an account at session start, or add one to the current session using `addAccount`.',
    );
  }
}

import 'dotenv/config';
import { ApiPromise } from '@polkadot/api';
import { EventRecord } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, ProofProcessor } from '../../types';
import { ZkVerifyEvents } from '../../enums';
import { proofConfigurations, ProofType } from '../../config';

/**
 * Waits for a specific NewAttestation event and returns the associated data.
 *
 * @param api - The ApiPromise instance.
 * @param attestationId - The attestation ID to wait for.
 * @param emitter - The EventEmitter instance to emit events.
 *
 * @returns A promise that resolves to an AttestationEvent object if the attestation is confirmed, or rejects with an error.
 *
 * @throws An error if the attestation ID is null or if there is an issue subscribing to events.
 *
 * @emits attestationConfirmed - When the specified attestation is confirmed.
 * @emits error - If there is an error waiting for the attestation or if the attestation ID is null.
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
    const handleEvents = (events: EventRecord[]) => {
      try {
        events.forEach((record) => {
          const { event } = record;

          if (event.section === 'poe' && event.method === 'NewAttestation') {
            const currentAttestationId = Number(event.data[0]);

            if (currentAttestationId === attestationId) {
              unsubscribe();

              const attestationEvent: AttestationEvent = {
                id: currentAttestationId,
                attestation: event.data[1].toString(),
              };

              emitter.emit(
                ZkVerifyEvents.AttestationConfirmed,
                attestationEvent,
              );
              resolve(attestationEvent);
            } else if (currentAttestationId < attestationId) {
              emitter.emit(ZkVerifyEvents.AttestationBeforeExpected, {
                expectedId: attestationId,
                receivedId: currentAttestationId,
                event: record.event,
              });
            } else if (currentAttestationId > attestationId) {
              emitter.emit(ZkVerifyEvents.AttestationMissed, {
                expectedId: attestationId,
                receivedId: currentAttestationId,
                event: record.event,
              });
              unsubscribe();
              reject(
                new Error(
                  `Missed the attestation ID ${attestationId}. Received a later attestation ID ${currentAttestationId}.`,
                ),
              );
            }
          }
        });
      } catch (error) {
        emitter.emit(
          ZkVerifyEvents.ErrorEvent,
          error instanceof Error
            ? error
            : new Error('Attestation waiting failed with an unknown error.'),
        );
        reject(error);
      }
    };

    let unsubscribe: () => void;

    api.query.system
      .events((events) => handleEvents(events))
      .then((unsub) => {
        unsubscribe = unsub as unknown as () => void;
      })
      .catch((error) => {
        emitter.emit(
          ZkVerifyEvents.ErrorEvent,
          error instanceof Error
            ? error
            : new Error('Attestation waiting failed with an unknown error.'),
        );
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

import 'dotenv/config';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { EventRecord } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import path from 'path';
import { EventEmitter } from "events";

/**
 * Handles events emitted by the zkVerify blockchain.
 * @param events - The array of event records.
 * @param callback - The callback function to execute when the event matches criteria.
 */
export function handleEvents(events: EventRecord[], callback: (data: any[]) => void): void {
    events.forEach(({ event: { data, method, section } }) => {
        if (section === 'poe' && method === 'NewElement') {
            callback(data);
        }
    });
}

/**
 * Waits for a specific NewAttestation event.
 * @param api - The ApiPromise instance.
 * @param attestationId - The attestation ID to wait for.
 * @param emitter - The EventEmitter instance to emit events.
 * @returns A promise that resolves to the attestation data.
 * @throws An error if the attestation ID is null or the wait times out.
 */
export async function waitForNewAttestation(
    api: ApiPromise,
    attestationId: string | null,
    emitter: EventEmitter
): Promise<[number, string]> {
    return new Promise<[number, string]>(async (resolve, reject) => {
        if (!attestationId) {
            return reject(new Error("Attestation ID is null, cannot wait for event."));
        }

        try {
            const unsubscribe = await api.query.system.events((events: EventRecord[]) => {
                events.forEach((record) => {
                    const { event } = record;

                    if (event.section === "poe" && event.method === "NewAttestation") {
                        const currentAttestationId = event.data[0].toString();
                        if (currentAttestationId === attestationId) {
                            unsubscribe();
                            // Emit the attestationConfirmed event here
                            emitter.emit('attestationConfirmed', {
                                attestationId: currentAttestationId,
                                proofLeaf: event.data[1].toString(),
                            });
                            resolve([parseInt(currentAttestationId), event.data[1].toString()]);
                        }
                    }
                });
            }) as unknown as () => void;
        } catch (error) {
            reject(new Error(`Error subscribing to system events: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
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
            await new Promise(resolve => setTimeout(resolve, 1000));
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
 * @throws {Error} - Throws an error with detailed information if proof submission fails.
 */
export const submitProof = (api: ApiPromise, pallet: string, params: any[]): SubmittableExtrinsic<'promise'> => {
    try {
        return api.tx[pallet].submitProof(...params);
    } catch (error: any) {
        const errorDetails = `
            Error submitting proof:
            Pallet: ${pallet}
            Params: ${JSON.stringify(params, null, 2)}
            Error: ${error.message}
        `;
        throw new Error(errorDetails);
    }
};

/**
 * Dynamically loads and returns the proof processor for the specified proof type.
 *
 * @param {string} proofType - The type of the proof for which to load the processor.
 * @returns {Promise<any>} - A promise that resolves to the proof processor.
 * @throws {Error} - Throws an error if the proof processor cannot be loaded.
 */
export async function getProofProcessor(proofType: string): Promise<any> {
    try {
        const processorPath = path.join(__dirname, '..', '..', 'ProofTypes', proofType, 'processor');
        const processorModule = await import(processorPath);

        return processorModule.default;
    } catch (error) {
        throw new Error(`Failed to load proof processor for type: ${proofType}. Error: ${error}`);
    }
}

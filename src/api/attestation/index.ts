import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'events';
import { AttestationEvent } from '../../types';

/**
 * Subscribes to NewAttestation events on the chain and triggers the provided callback as they occur.
 * Optionally filters the events by attestationId.
 * If attestationId is specified, the subscription will automatically end after the event is received.
 *
 * @param {ApiPromise} api - The Polkadot.js API instance.
 * @param {Function} callback - The callback function to call with the event data when a NewAttestation event occurs.
 * @param {string} [attestationId] - Optional attestation ID to filter events by and subsequently unsubscribe.
 * @returns {EventEmitter} An EventEmitter that handles the subscription.
 */
export function subscribeToNewAttestations(
    api: ApiPromise,
    callback: (data: AttestationEvent) => void,
    attestationId?: string
): EventEmitter {
    const emitter = new EventEmitter();

    api.query.system.events((events) => {
        events.forEach((record) => {
            const { event } = record;

            if (event.section === "poe" && event.method === "NewAttestation") {
                const currentAttestationId = event.data[0].toString();

                if (!attestationId || currentAttestationId === attestationId) {
                    const attestationEvent: AttestationEvent = {
                        id: Number(event.data[0]),
                        attestation: event.data[1].toString()
                    };
                    console.log('NewAttestation event data:', attestationEvent);
                    callback(attestationEvent);

                    if (attestationId && currentAttestationId === attestationId) {
                        emitter.emit('unsubscribe');
                    }
                }
            }
        });
    }).catch(error => {
        emitter.emit('error', error);
    });

    emitter.on('unsubscribe', () => {
        emitter.removeAllListeners();
        console.log('Unsubscribed from NewAttestation events.');
    });

    return emitter;
}

/**
 * Unsubscribes from the current NewAttestation events subscription.
 * This stops any further events from being emitted.
 *
 * @param {EventEmitter} emitter - The EventEmitter to unsubscribe.
 */
export function unsubscribeFromNewAttestations(emitter: EventEmitter): void {
    emitter.emit('unsubscribe');
}

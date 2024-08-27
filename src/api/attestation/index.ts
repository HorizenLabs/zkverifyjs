import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'events';
import { AttestationEvent } from '../../types';
import { ZkVerifyEvents } from '../../enums';

/**
 * Subscribes to NewAttestation events on the chain and triggers the provided callback as they occur.
 * Optionally filters the events by attestationId.
 * If attestationId is specified, the subscription will automatically end after the event is received.
 *
 * @param {ApiPromise} api - The Polkadot.js API instance.
 * @param {Function} callback - The callback function to call with the event data when a NewAttestation event occurs.
 * @param {number} [attestationId] - Optional attestation ID to filter events by and subsequently unsubscribe.
 * @returns {EventEmitter} An EventEmitter that handles the subscription.
 */
export function subscribeToNewAttestations(
  api: ApiPromise,
  callback: (data: AttestationEvent) => void,
  attestationId?: number,
): EventEmitter {
  const emitter = new EventEmitter();

  api.query.system
    .events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (event.section === 'poe' && event.method === 'NewAttestation') {
          const currentAttestationId = Number(event.data[0]);

          if (attestationId) {
            if (currentAttestationId > attestationId) {
              emitter.emit(ZkVerifyEvents.AttestationMissed, {
                expectedId: attestationId,
                receivedId: currentAttestationId,
                event: record.event,
              });

              unsubscribeFromNewAttestations(emitter);

              return;
            }

            if (currentAttestationId < attestationId) {
              emitter.emit(ZkVerifyEvents.AttestationBeforeExpected, {
                expectedId: attestationId,
                receivedId: currentAttestationId,
                event: record.event,
              });
              return;
            }

            if (currentAttestationId === attestationId) {
              const attestationEvent: AttestationEvent = {
                id: currentAttestationId,
                attestation: event.data[1].toString(),
              };
              callback(attestationEvent);
              emitter.emit(
                ZkVerifyEvents.AttestationConfirmed,
                attestationEvent,
              );

              unsubscribeFromNewAttestations(emitter);
            }
          } else {
            const attestationEvent: AttestationEvent = {
              id: currentAttestationId,
              attestation: event.data[1].toString(),
            };
            callback(attestationEvent);
          }
        }
      });
    })
    .catch((error) => {
      emitter.emit(ZkVerifyEvents.ErrorEvent, error);
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
  emitter.emit(ZkVerifyEvents.Unsubscribe);
  emitter.removeAllListeners();
}

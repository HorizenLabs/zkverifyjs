import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { EventEmitter } from 'events';
import {
  subscribeToNewAttestations,
  unsubscribeFromNewAttestations,
} from './index';
import { ZkVerifyEvents } from '../../enums';
import { ApiPromise } from '@polkadot/api';

describe('subscribeToNewAttestations', () => {
  let api: ApiPromise;
  let callback: jest.Mock;

  beforeEach(() => {
    api = {
      query: {
        system: {
          events: jest.fn(),
        },
      },
    } as unknown as ApiPromise;

    callback = jest.fn();
  });

  it('should emit AttestationMissed event when attestationId is lower than received and unsubscribe all listeners', async () => {
    const events = [
      {
        event: {
          section: 'poe',
          method: 'NewAttestation',
          data: ['3', 'attestationData'],
        },
      },
    ];

    const mockEvents = jest.fn().mockImplementation((cb: any) => {
      setTimeout(() => cb(events), 0);
      return Promise.resolve();
    });

    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback, 1);
    const emitSpy = jest.spyOn(emitter, 'emit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.AttestationMissed, {
      expectedId: 1,
      receivedId: 3,
      event: events[0].event,
    });

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.Unsubscribe);
  });

  it('should emit AttestationBeforeExpected event when attestationId is higher than received', async () => {
    const events = [
      {
        event: {
          section: 'poe',
          method: 'NewAttestation',
          data: ['1', 'attestationData'],
        },
      },
    ];

    const mockEvents = jest.fn().mockImplementation((cb: any) => {
      setTimeout(() => cb(events), 0);
      return Promise.resolve();
    });

    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback, 3);
    const emitSpy = jest.spyOn(emitter, 'emit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(emitSpy).toHaveBeenCalledWith(
      ZkVerifyEvents.AttestationBeforeExpected,
      {
        expectedId: 3,
        receivedId: 1,
        event: events[0].event,
      },
    );
  });

  it('should emit AttestationConfirmed event when attestationId matches received', async () => {
    const events = [
      {
        event: {
          section: 'poe',
          method: 'NewAttestation',
          data: ['2', 'attestationData'],
        },
      },
    ];

    const mockEvents = jest.fn().mockImplementation((cb: any) => {
      setTimeout(() => cb(events), 0);
      return Promise.resolve();
    });

    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback, 2);
    const emitSpy = jest.spyOn(emitter, 'emit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(callback).toHaveBeenCalledWith({
      id: 2,
      attestation: 'attestationData',
    });

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.AttestationConfirmed, {
      id: 2,
      attestation: 'attestationData',
    });

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.Unsubscribe);
  });

  it('should call callback without attestationId and not unsubscribe', async () => {
    const events = [
      {
        event: {
          section: 'poe',
          method: 'NewAttestation',
          data: ['2', 'attestationData'],
        },
      },
    ];

    const mockEvents = jest.fn().mockImplementation((cb: any) => {
      setTimeout(() => cb(events), 0);
      return Promise.resolve();
    });

    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback);
    const emitSpy = jest.spyOn(emitter, 'emit');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(callback).toHaveBeenCalledWith({
      id: 2,
      attestation: 'attestationData',
    });

    expect(emitSpy).not.toHaveBeenCalledWith(ZkVerifyEvents.Unsubscribe);
  });

  it('should emit ErrorEvent on any error', async () => {
    const error = new Error('Some error occurred');

    const mockEvents = jest.fn().mockRejectedValue(error as never);
    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback);
    const emitSpy = jest.spyOn(emitter, 'emit');

    await new Promise<void>((resolve) => {
      emitter.on(ZkVerifyEvents.ErrorEvent, () => resolve());
    });

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.ErrorEvent, error);
  });

  it('should emit Unsubscribe event and remove all listeners when unsubscribe is triggered', async () => {
    const events = [
      {
        event: {
          section: 'poe',
          method: 'NewAttestation',
          data: ['3', 'attestationData'],
        },
      },
    ];

    const mockEvents = jest.fn().mockImplementation((cb: any) => {
      setTimeout(() => cb(events), 0);
      return Promise.resolve();
    });

    api.query.system.events = mockEvents as any;

    const emitter = subscribeToNewAttestations(api, callback, 1);
    const emitSpy = jest.spyOn(emitter, 'emit');
    const removeListenersSpy = jest.spyOn(emitter, 'removeAllListeners');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.AttestationMissed, {
      expectedId: 1,
      receivedId: 3,
      event: events[0].event,
    });

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.Unsubscribe);

    expect(removeListenersSpy).toHaveBeenCalled();
  });

  it('unsubscribeFromNewAttestations should emit Unsubscribe event', async () => {
    const emitter = new EventEmitter();
    const emitSpy = jest.spyOn(emitter, 'emit');

    unsubscribeFromNewAttestations(emitter);

    expect(emitSpy).toHaveBeenCalledWith(ZkVerifyEvents.Unsubscribe);
  });
});

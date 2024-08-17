import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { EventEmitter } from 'events';
import { ProofTransactionResult } from '../../types';
import { verify, verifyAndWaitForAttestationEvent } from '../../verify';

export async function verifyProof(
    api: ApiPromise,
    provider: WsProvider,
    account: KeyringPair,
    proofType: string,
    ...proofData: any[]
): Promise<{
    events: EventEmitter;
    transactionResult: Promise<ProofTransactionResult>;
}> {
    const events = new EventEmitter();

    const transactionResult = new Promise<ProofTransactionResult>((resolve, reject) => {
        verify(
            { api, provider, account },
            proofType,
            events,
            ...proofData
        ).then(resolve)
            .catch((error) => {
                events.emit('error', error);
                reject(error);
            });
    });

    return { events, transactionResult };
}

export async function verifyProofAndWaitForAttestationEvent(
    api: ApiPromise,
    provider: WsProvider,
    account: KeyringPair,
    proofType: string,
    ...proofData: any[]
): Promise<{
    events: EventEmitter;
    transactionResult: Promise<ProofTransactionResult>;
}> {
    const events = new EventEmitter();

    const transactionResult = new Promise<ProofTransactionResult>((resolve, reject) => {
        verifyAndWaitForAttestationEvent(
            { api, provider, account },
            proofType,
            events,
            ...proofData
        ).then(resolve)
            .catch((error) => {
                events.emit('error', error);
                reject(error);
            });
    });

    return { events, transactionResult };
}
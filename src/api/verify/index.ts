import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { EventEmitter } from 'events';
import { ProofTransactionResult } from '../../types';
import { verify } from '../../verify';
import { VerifyOptions } from "../../session/types";
import { AccountConnection } from "../../connection/types";

export async function verifyProof(
    connection: AccountConnection,
    options: VerifyOptions,
    ...proofData: any[]
): Promise<{
    events: EventEmitter;
    transactionResult: Promise<ProofTransactionResult>;
}> {
    const events = new EventEmitter();

    const transactionResult = new Promise<ProofTransactionResult>((resolve, reject) => {
        verify(
            connection,
            options,
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

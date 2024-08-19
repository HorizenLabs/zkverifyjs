import { EventEmitter } from 'events';
import { VerifyTransactionInfo } from '../../types';
import { verify } from '../../verify';
import { VerifyOptions } from "../../session/types";
import { AccountConnection } from "../../connection/types";
import { ZkVerifyEvents } from "../../enums";

export async function verifyProof(
    connection: AccountConnection,
    options: VerifyOptions,
    ...proofData: any[]
): Promise<{
    events: EventEmitter;
    transactionResult: Promise<VerifyTransactionInfo>;
}> {
    const events = new EventEmitter();

    const transactionResult = new Promise<VerifyTransactionInfo>((resolve, reject) => {
        verify(
            connection,
            options,
            events,
            ...proofData
        ).then(resolve)
            .catch((error) => {
                events.emit(ZkVerifyEvents.ErrorEvent, error);
                reject(error);
            });
    });

    return { events, transactionResult };
}

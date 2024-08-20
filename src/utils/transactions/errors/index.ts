import { ApiPromise, SubmittableResult } from "@polkadot/api";
import { EventEmitter } from "events";
import { VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../../../types";
import { ZkVerifyEvents, TransactionStatus } from "../../../enums";

export const decodeDispatchError = (api: ApiPromise, dispatchError: any): string => {
    if (dispatchError.isModule) {
        const decoded = api.registry.findMetaError(dispatchError.asModule);
        const { docs, name, section } = decoded;
        return `${section}.${name}: ${docs.join(' ')}`;
    } else {
        return dispatchError.toString();
    }
};

export const handleError = (
    emitter: EventEmitter,
    api: ApiPromise,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo,
    error: any,
    status?: SubmittableResult['status']
): void => {
    let decodedError = error instanceof Error ? error.message : decodeDispatchError(api, error);

    if (status) {
        if (status.isDropped) {
            transactionInfo.status = TransactionStatus.Dropped;
            decodedError = 'Transaction was dropped.';
        } else if (status.isInvalid) {
            transactionInfo.status = TransactionStatus.Invalid;
            decodedError = 'Transaction was marked as invalid.';
        } else if (status.isRetracted) {
            transactionInfo.status = TransactionStatus.Retracted;
            decodedError = 'Transaction was retracted.';
        } else if (status.isUsurped) {
            transactionInfo.status = TransactionStatus.Usurped;
            decodedError = 'Transaction was usurped.';
        }
    }

    if (emitter.listenerCount(ZkVerifyEvents.ErrorEvent) > 0) {
        emitter.emit(ZkVerifyEvents.ErrorEvent, { proofType: transactionInfo.proofType, error: decodedError });
    } else {
        throw new Error(`Unhandled error: ${decodedError}`);
    }
};

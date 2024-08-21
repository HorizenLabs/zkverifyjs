import { ApiPromise, SubmittableResult } from "@polkadot/api";
import { EventEmitter } from "events";
import { VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../../../types";
import { ZkVerifyEvents, TransactionStatus } from "../../../enums";

export const decodeDispatchError = (api: ApiPromise, dispatchError: unknown): string => {
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
    error: unknown,
    status?: SubmittableResult['status']
): void => {
    let decodedError = error instanceof Error ? error.message : decodeDispatchError(api, error);

    if (status && status.isInvalid && transactionInfo.status !== TransactionStatus.Finalized) {
        transactionInfo.status = TransactionStatus.Invalid;
        decodedError = 'Transaction was marked as invalid.';
    }

    if (emitter.listenerCount(ZkVerifyEvents.ErrorEvent) > 0) {
        emitter.emit(ZkVerifyEvents.ErrorEvent, { proofType: transactionInfo.proofType, error: decodedError });
    } else {
        throw new Error(`Unhandled error: ${decodedError}`);
    }
};

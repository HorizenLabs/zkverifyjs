import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'events';
import { SubmittableResult } from '@polkadot/api';
import { TransactionInfo } from "../../../types";
import { decodeDispatchError } from "../errors";

export const handleTransactionEvents = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    transactionInfo: TransactionInfo,
    emitter: EventEmitter,
    setAttestationId: (id: string | null) => void
): TransactionInfo => {

    events.forEach(({ event, phase }) => {
        if (phase.isApplyExtrinsic) {
            transactionInfo.extrinsicIndex = phase.asApplyExtrinsic.toNumber();
        }

        if (event.section === 'transactionPayment' && event.method === 'TransactionFeePaid') {
            transactionInfo.feeInfo = {
                payer: event.data[0].toString(),
                actualFee: event.data[1].toString(),
                tip: event.data[2].toString(),
                paysFee: 'Yes',
            };
        }

        if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
            const dispatchInfo = event.data[0] as any;
            transactionInfo.weightInfo = {
                refTime: dispatchInfo.weight.refTime?.toString(),
                proofSize: dispatchInfo.weight.proofSize?.toString(),
            };
            transactionInfo.txClass = dispatchInfo.class.toString();

            if (transactionInfo.feeInfo) {
                transactionInfo.feeInfo.paysFee = dispatchInfo.paysFee.toString();
            }
        }

        if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
            const [dispatchError] = event.data;
            const decodedError = decodeDispatchError(api, dispatchError);
            emitter.emit('error', new Error(`Transaction failed with error: ${decodedError}`));
        }

        if (event.section === 'poe' && event.method === 'NewElement') {
            transactionInfo.attestationId = event.data[1].toString();
            transactionInfo.proofLeaf = event.data[0].toString();
            setAttestationId(transactionInfo.attestationId);
        }
    });

    return transactionInfo;
};

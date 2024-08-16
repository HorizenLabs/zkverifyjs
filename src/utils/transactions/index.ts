import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { TransactionInfo } from "../../types";
import { waitForNewAttestation } from "../helpers";

const decodeDispatchError = (api: ApiPromise, dispatchError: any): string => {
    if (dispatchError.isModule) {
        const decoded = api.registry.findMetaError(dispatchError.asModule);
        const { docs, name, section } = decoded;
        return `${section}.${name}: ${docs.join(' ')}`;
    } else {
        return dispatchError.toString();
    }
};

const createTransactionInfo = (
    proofType: string,
    blockHash: string,
    attestationId: string | null,
    proofLeaf: string | null,
    status: 'inBlock' | 'finalized',
    txHash?: string,
    extrinsicIndex?: number,
    feeInfo?: {
        payer: string;
        actualFee: string;
        tip: string;
        paysFee: string;
    },
    weightInfo?: {
        refTime: string;
        proofSize: string;
    },
    txClass?: string
): TransactionInfo => {
    return {
        blockHash,
        proofType,
        attestationId,
        proofLeaf,
        status,
        txHash,
        extrinsicIndex,
        feeInfo,
        weightInfo,
        txClass,
    };
};

const waitForAttestation = async (
    api: ApiPromise,
    attestationId: string | null,
    emitter: EventEmitter
): Promise<boolean> => {
    if (!attestationId) {
        emitter.emit('error', new Error('No attestation ID found.'));
        return false;
    }
    try {
        await waitForNewAttestation(api, attestationId, emitter);
        return true;
    } catch (error: unknown) {
        emitter.emit('error', error instanceof Error ? error : new Error('Attestation waiting failed with an unknown error.'));
        return false;
    }
};

const handleInBlock = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: string | null) => void,
    emitter: EventEmitter
): TransactionInfo => {
    let attestationId: string | null = null;
    let proofLeaf: string | null = null;
    let extrinsicIndex: number | undefined;
    let feeInfo: { payer: string; actualFee: string; tip: string; paysFee: string } | undefined;
    let weightInfo: { refTime: string; proofSize: string } | undefined;
    let txClass: string | undefined;

    events.forEach(({ event, phase }) => {
        if (phase.isApplyExtrinsic) {
            extrinsicIndex = phase.asApplyExtrinsic.toNumber();
        }

        if (event.section === 'transactionPayment' && event.method === 'TransactionFeePaid') {
            feeInfo = {
                payer: event.data[0].toString(),
                actualFee: event.data[1].toString(),
                tip: event.data[2].toString(),
                paysFee: 'Yes',
            };
        }

        if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
            const dispatchInfo = event.data[0] as any;
            weightInfo = {
                refTime: dispatchInfo.weight.refTime?.toString(),
                proofSize: dispatchInfo.weight.proofSize?.toString(),
            };
            txClass = dispatchInfo.class.toString();

            if (feeInfo) {
                feeInfo.paysFee = dispatchInfo.paysFee.toString();
            }
        }

        if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
            const [dispatchError] = event.data;
            const decodedError = decodeDispatchError(api, dispatchError);
            emitter.emit('error', new Error(`Transaction failed with error: ${decodedError}`));
        }

        if (event.section === 'poe' && event.method === 'NewElement') {
            attestationId = event.data[1].toString();
            proofLeaf = event.data[0].toString();
            setAttestationId(attestationId);
        }
    });

    const blockInfo = createTransactionInfo(
        proofType,
        blockHash,
        attestationId,
        proofLeaf,
        'inBlock',
        txHash,
        extrinsicIndex,
        feeInfo,
        weightInfo,
        txClass
    );

    emitter.emit('includedInBlock', blockInfo);

    return blockInfo;
};

const handleFinalized = async (
    api: ApiPromise,
    proofType: string,
    attestationId: string | null,
    blockHash: string | null,
    proofLeaf: string | null,
    dispatchError: any,
    emitter: EventEmitter,
    txHash?: string,
    extrinsicIndex?: number,
    feeInfo?: { payer: string; actualFee: string; tip: string; paysFee: string },
    weightInfo?: { refTime: string; proofSize: string },
    txClass?: string
): Promise<TransactionInfo | null> => {
    if (dispatchError) {
        const decodedError = decodeDispatchError(api, dispatchError);
        emitter.emit('error', { proofType, error: decodedError });

        return null;
    }
    const blockInfo = createTransactionInfo(
        proofType,
        blockHash || '',
        attestationId,
        proofLeaf,
        'finalized',
        txHash,
        extrinsicIndex,
        feeInfo,
        weightInfo,
        txClass
    );

    if (attestationId) {
        emitter.emit('finalized', blockInfo);
    } else {
        emitter.emit('error', { ...blockInfo, error: 'Finalized but no attestation ID found.' });
    }

    return blockInfo;
};

export const handleTransaction = async (
    api: ApiPromise,
    submitProof: SubmittableExtrinsic<"promise">,
    account: KeyringPair,
    proofType: string,
    emitter: EventEmitter,
    waitForNewAttestationEvent: boolean = false
): Promise<{
    finalized: boolean;
    attestationConfirmed: boolean;
    attestationId: string | null;
    blockHash: string | null;
    proofLeaf: string | null;
    txHash?: string;
    extrinsicIndex?: number;
    feeInfo?: { payer: string; actualFee: string; tip: string; paysFee: string };
    weightInfo?: { refTime: string; proofSize: string };
    txClass?: string;
}> => {
    let attestationId: string | null = null;
    let blockHash: string | null = null;
    let proofLeaf: string | null = null;
    let txHash: string | undefined;
    let extrinsicIndex: number | undefined;
    let feeInfo: { payer: string; actualFee: string; tip: string; paysFee: string } | undefined;
    let weightInfo: { refTime: string; proofSize: string } | undefined;
    let txClass: string | undefined;

    const setAttestationId = (id: string | null) => {
        attestationId = id;
    };

    return new Promise<{
        finalized: boolean;
        attestationConfirmed: boolean;
        attestationId: string | null;
        blockHash: string | null;
        proofLeaf: string | null;
        txHash?: string;
        extrinsicIndex?: number;
        feeInfo?: { payer: string; actualFee: string; tip: string; paysFee: string };
        weightInfo?: { refTime: string; proofSize: string };
        txClass?: string;
    }>((resolve, reject) => {
        submitProof.signAndSend(account, async (result: SubmittableResult) => {
            try {
                if (result.status.isInBlock) {
                    txHash = result.txHash.toString();
                    blockHash = result.status.asInBlock.toString();
                    const blockInfo = handleInBlock(api, result.events, proofType, blockHash, txHash, setAttestationId, emitter);
                    proofLeaf = blockInfo.proofLeaf;
                }

                if (result.status.isFinalized) {
                    const blockInfo = await handleFinalized(api, proofType, attestationId, blockHash, proofLeaf, result.dispatchError, emitter, txHash, extrinsicIndex, feeInfo, weightInfo, txClass);
                    const finalized = !!blockInfo;

                    let attestationConfirmed = false;
                    if (waitForNewAttestationEvent && finalized && attestationId) {
                        attestationConfirmed = await waitForAttestation(api, attestationId, emitter);
                    }

                    resolve({
                        finalized,
                        attestationConfirmed,
                        attestationId,
                        blockHash,
                        proofLeaf,
                        txHash,
                        extrinsicIndex,
                        feeInfo,
                        weightInfo,
                        txClass,
                    });
                } else if (result.status.isDropped || result.status.isInvalid) {
                    emitter.emit('error', new Error('Transaction was dropped or marked as invalid.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                        txHash,
                        extrinsicIndex,
                        feeInfo,
                        weightInfo,
                        txClass,
                    });
                } else if (result.status.isRetracted) {
                    emitter.emit('error', new Error('Transaction was retracted.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                        txHash,
                        extrinsicIndex,
                        feeInfo,
                        weightInfo,
                        txClass,
                    });
                } else if (result.status.isUsurped) {
                    emitter.emit('error', new Error('Transaction was replaced by another transaction with the same nonce.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                        txHash,
                        extrinsicIndex,
                        feeInfo,
                        weightInfo,
                        txClass,
                    });
                } else if (result.status.isBroadcast) {
                    emitter.emit('broadcast', { proofType, status: 'Transaction broadcasted.' });
                }
            } catch (error) {
                reject(error);
            }
        });
    });
};

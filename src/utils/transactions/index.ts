import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, ProofTransactionResult, TransactionInfo } from "../../types";
import { waitForNewAttestationEvent } from "../helpers";
import { decodeDispatchError } from "./errors";
import { handleTransactionEvents } from "./events";
import { VerifyOptions } from "../../session/types";

const handleInBlock = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: number | null) => void,
    emitter: EventEmitter
): TransactionInfo => {
    let transactionInfo: TransactionInfo = {
        blockHash,
        proofType,
        attestationId: null,
        leafDigest: null,
        status: 'inBlock',
        txHash,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
    };

    transactionInfo = handleTransactionEvents(api, events, transactionInfo, emitter, setAttestationId);
    emitter.emit('includedInBlock', transactionInfo);

    return transactionInfo;
};

const handleFinalized = async (
    api: ApiPromise,
    transactionInfo: TransactionInfo,
    dispatchError: any,
    emitter: EventEmitter
): Promise<TransactionInfo> => {
    if (dispatchError) {
        const decodedError = decodeDispatchError(api, dispatchError);
        emitter.emit('error', { proofType: transactionInfo.proofType, error: decodedError });
        return transactionInfo;
    }

    transactionInfo.status = 'finalized';

    if (transactionInfo.attestationId) {
        emitter.emit('finalized', transactionInfo);
    } else {
        emitter.emit('error', { ...transactionInfo, error: 'Finalized but no attestation ID found.' });
    }

    return transactionInfo;
};

export const handleTransaction = async (
    api: ApiPromise,
    submitProof: SubmittableExtrinsic<"promise">,
    account: KeyringPair,
    emitter: EventEmitter,
    options: VerifyOptions
): Promise<ProofTransactionResult> => {
    const { proofType, waitForNewAttestationEvent: shouldWaitForAttestation = false, nonce } = options;

    let transactionInfo: TransactionInfo = {
        blockHash: '',
        proofType,
        attestationId: null,
        leafDigest: null,
        status: 'inBlock',
        txHash: undefined,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
        attestationEvent: undefined,
    };

    const setAttestationId = (id: number | null) => {
        transactionInfo.attestationId = id;
    };

    let attestationPromise: Promise<AttestationEvent | undefined> | null = null;

    return new Promise<ProofTransactionResult>((resolve, reject) => {
        submitProof
            .signAndSend(account, { nonce }, async (result: SubmittableResult) => {
                try {
                    if (result.status.isInBlock) {
                        transactionInfo.txHash = result.txHash.toString();
                        transactionInfo.blockHash = result.status.asInBlock.toString();
                        transactionInfo = handleInBlock(api, result.events, proofType, transactionInfo.blockHash, transactionInfo.txHash, setAttestationId, emitter);

                        if (shouldWaitForAttestation && transactionInfo.attestationId) {
                            attestationPromise = waitForNewAttestationEvent(api, transactionInfo.attestationId, emitter);
                        }
                    }

                    if (result.status.isFinalized) {
                        transactionInfo = await handleFinalized(api, transactionInfo, result.dispatchError, emitter);
                        const finalized = !!transactionInfo;

                        if (shouldWaitForAttestation && attestationPromise) {
                            try {
                                transactionInfo.attestationEvent = await attestationPromise;
                            } catch (error) {
                                return reject(error);
                            }
                        }

                        resolveTransaction(resolve, finalized, !!transactionInfo.attestationEvent, transactionInfo);
                    } else if (result.status.isDropped || result.status.isInvalid) {
                        emitter.emit('error', new Error('Transaction was dropped or marked as invalid.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
                    } else if (result.status.isRetracted) {
                        emitter.emit('error', new Error('Transaction was retracted.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
                    } else if (result.status.isUsurped) {
                        emitter.emit('error', new Error('Transaction was replaced by another transaction with the same nonce.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
                    } else if (result.status.isBroadcast) {
                        emitter.emit('broadcast', { proofType, status: 'Transaction broadcasted.' });
                    }
                } catch (error) {
                    reject(error);
                }
            });
    });
};

const resolveTransaction = (
    resolve: (value: {
        finalized: boolean;
        attestationConfirmed: boolean;
        transactionInfo: TransactionInfo;
    }) => void,
    finalized: boolean,
    attestationConfirmed: boolean,
    transactionInfo: TransactionInfo
) => {
    resolve({
        finalized,
        attestationConfirmed,
        transactionInfo,
    });
};

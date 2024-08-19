import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, TransactionInfo, VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../../types";
import { waitForNewAttestationEvent } from "../helpers";
import { decodeDispatchError } from "./errors";
import { handleTransactionEvents } from "./events";
import { VerifyOptions } from "../../session/types";
import { TransactionStatus, TransactionType, ZkVerifyEvents } from "../../enums";

const handleInBlock = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: number | undefined) => void,
    emitter: EventEmitter,
    transactionType: TransactionType
): VerifyTransactionInfo | VKRegistrationTransactionInfo => {
    let transactionInfo: TransactionInfo = {
        blockHash,
        proofType,
        status: TransactionStatus.InBlock,
        txHash,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
    };

    transactionInfo = handleTransactionEvents(api, events, transactionInfo, emitter, setAttestationId, transactionType);
    emitter.emit(ZkVerifyEvents.IncludedInBlock, transactionInfo);

    return transactionInfo;
};

const handleFinalized = async (
    api: ApiPromise,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo,
    dispatchError: any,
    emitter: EventEmitter,
    transactionType: TransactionType
): Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo> => {
    if (dispatchError) {
        const decodedError = decodeDispatchError(api, dispatchError);
        emitter.emit(ZkVerifyEvents.ErrorEvent, { proofType: transactionInfo.proofType, error: decodedError });
        return transactionInfo;
    }

    transactionInfo.status = TransactionStatus.Finalized;

    if (transactionType === TransactionType.Verify) {
        const verifyTransactionInfo = transactionInfo as VerifyTransactionInfo;
        if (verifyTransactionInfo.attestationId) {
            emitter.emit(ZkVerifyEvents.Finalized, verifyTransactionInfo);
        } else {
            emitter.emit(ZkVerifyEvents.ErrorEvent, { ...verifyTransactionInfo, error: 'Finalized but no attestation ID found.' });
        }
    } else if (transactionType === TransactionType.VKRegistration) {
        const vkRegistrationInfo = transactionInfo as VKRegistrationTransactionInfo;
        if (vkRegistrationInfo.statementHash) {
            emitter.emit(ZkVerifyEvents.Finalized, vkRegistrationInfo);
        } else {
            emitter.emit(ZkVerifyEvents.ErrorEvent, { ...vkRegistrationInfo, error: 'Finalized but no statement hash found.' });
        }
    }

    return transactionInfo;
};


export const handleTransaction = async (
    api: ApiPromise,
    submitExtrinsic: SubmittableExtrinsic<"promise">,
    account: KeyringPair,
    emitter: EventEmitter,
    options: VerifyOptions,
    transactionType: TransactionType
): Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo> => {
    const { proofType, waitForNewAttestationEvent: shouldWaitForAttestation = false, nonce } = options;

    let transactionInfo: TransactionInfo = {
        blockHash: '',
        proofType,
        status: TransactionStatus.Pending,
        txHash: undefined,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
    };

    const setAttestationId = (id: number | undefined) => {
        (transactionInfo as VerifyTransactionInfo).attestationId = id;
    };

    let attestationPromise: Promise<AttestationEvent | undefined> | null = null;
    let statementHash: string | undefined;

    return new Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo>((resolve, reject) => {
        submitExtrinsic
            .signAndSend(account, { nonce }, async (result: SubmittableResult) => {
                try {
                    if (result.status.isInBlock) {
                        transactionInfo.txHash = result.txHash.toString();
                        transactionInfo.blockHash = result.status.asInBlock.toString();
                        transactionInfo = handleInBlock(api, result.events, proofType, transactionInfo.blockHash, transactionInfo.txHash, setAttestationId, emitter, transactionType);

                        if (transactionType === TransactionType.Verify) {
                            if (shouldWaitForAttestation && (transactionInfo as VerifyTransactionInfo).attestationId) {
                                attestationPromise = waitForNewAttestationEvent(api, (transactionInfo as VerifyTransactionInfo).attestationId!, emitter);
                            }
                        }
                    }

                    if (result.status.isFinalized) {
                        transactionInfo = await handleFinalized(api, transactionInfo, result.dispatchError, emitter, transactionType);

                        if (transactionType === TransactionType.Verify && shouldWaitForAttestation && attestationPromise) {
                            try {
                                (transactionInfo as VerifyTransactionInfo).attestationEvent = await attestationPromise;
                                (transactionInfo as VerifyTransactionInfo).attestationConfirmed = true;
                            } catch (error) {
                                return reject(error);
                            }
                        }

                        resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isDropped) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was dropped or marked as invalid.'));
                        transactionInfo.status = TransactionStatus.Dropped;
                        resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isInvalid) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was dropped or marked as invalid.'));
                        transactionInfo.status = TransactionStatus.Invalid;
                        resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isRetracted) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was retracted.'));
                        transactionInfo.status = TransactionStatus.Retracted;
                        resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isUsurped) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was replaced by another transaction with the same nonce.'));
                        transactionInfo.status = TransactionStatus.Usurped;
                        resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isBroadcast) {
                        emitter.emit(ZkVerifyEvents.Broadcast, { proofType, status: 'Transaction broadcasted.' });
                    }
                } catch (error) {
                    reject(error);
                }
            });
    });
};

const resolveTransaction = (
    resolve: (value: VerifyTransactionInfo | VKRegistrationTransactionInfo) => void,
    transactionInfo: TransactionInfo
) => {
    resolve(transactionInfo as VerifyTransactionInfo | VKRegistrationTransactionInfo);
};

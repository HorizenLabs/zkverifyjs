import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, VerifyTransactionInfo, VKRegistrationTransactionInfo, TransactionInfo } from "../../types";
import { waitForNewAttestationEvent } from "../helpers";
import { decodeDispatchError } from "./errors";
import { handleTransactionEvents } from "./events";
import { VerifyOptions } from "../../session/types";
import { TransactionType, ZkVerifyEvents } from "../../enums";

const handleInBlock = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: number | undefined) => void,
    emitter: EventEmitter,
    transactionType: TransactionType
): TransactionInfo => {
    let transactionInfo: TransactionInfo = {
        attestationId: undefined,
        blockHash,
        proofType,
        status: 'inBlock',
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
    transactionInfo: TransactionInfo,
    dispatchError: any,
    emitter: EventEmitter
): Promise<TransactionInfo> => {
    if (dispatchError) {
        const decodedError = decodeDispatchError(api, dispatchError);
        emitter.emit(ZkVerifyEvents.ErrorEvent, { proofType: transactionInfo.proofType, error: decodedError });
        return transactionInfo;
    }

    transactionInfo.status = 'finalized';

    if (transactionInfo.attestationId) {
        emitter.emit(ZkVerifyEvents.Finalized, transactionInfo);
    } else {
        emitter.emit(ZkVerifyEvents.ErrorEvent, { ...transactionInfo, error: 'Finalized but no attestation ID found.' });
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
        attestationId: undefined,
        blockHash: '',
        proofType,
        status: 'inBlock',
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

                        if (transactionType === TransactionType.VKRegistration) {
                            statementHash = result.events
                                .find(event => event.event.method === 'StatementHash')?.event.data[0].toString();
                            (transactionInfo as VKRegistrationTransactionInfo).statementHash = statementHash;
                        }
                    }

                    if (result.status.isFinalized) {
                        transactionInfo = await handleFinalized(api, transactionInfo, result.dispatchError, emitter);
                        const finalized = !!transactionInfo;

                        if (transactionType === TransactionType.Verify && shouldWaitForAttestation && attestationPromise) {
                            try {
                                (transactionInfo as VerifyTransactionInfo).attestationEvent = await attestationPromise;
                            } catch (error) {
                                return reject(error);
                            }
                        }

                        resolveTransaction(resolve, finalized, !!(transactionInfo as VerifyTransactionInfo).attestationEvent, transactionInfo);
                    } else if (result.status.isDropped || result.status.isInvalid) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was dropped or marked as invalid.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
                    } else if (result.status.isRetracted) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was retracted.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
                    } else if (result.status.isUsurped) {
                        emitter.emit(ZkVerifyEvents.ErrorEvent, new Error('Transaction was replaced by another transaction with the same nonce.'));
                        resolveTransaction(resolve, false, false, transactionInfo);
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
    finalized: boolean,
    attestationConfirmed: boolean,
    transactionInfo: TransactionInfo
) => {
    if (finalized) {
        if ('attestationId' in transactionInfo) {
            (transactionInfo as VerifyTransactionInfo).attestationConfirmed = attestationConfirmed;
        }
    }
    resolve(transactionInfo as VerifyTransactionInfo | VKRegistrationTransactionInfo);
};

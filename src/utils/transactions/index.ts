import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { AttestationEvent, TransactionInfo, VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../../types";
import { waitForNewAttestationEvent } from "../helpers";
import { handleTransactionEvents } from "./events";
import { VerifyOptions } from "../../session/types";
import { TransactionStatus, TransactionType, ZkVerifyEvents } from "../../enums";
import { handleError } from "./errors";

const handleInBlock = async (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: number | undefined) => void,
    emitter: EventEmitter,
    transactionType: TransactionType
): Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo> => {
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

    return transactionInfo as VerifyTransactionInfo | VKRegistrationTransactionInfo;
};

const handleFinalized = async (
    api: ApiPromise,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo,
    dispatchError: any,
    emitter: EventEmitter,
    transactionType: TransactionType
): Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo> => {
    if (dispatchError) {
        handleError(emitter, api, transactionInfo, dispatchError);
        return transactionInfo;
    }

    const finalizedTransactionInfo = Object.assign({}, transactionInfo, {
        status: TransactionStatus.Finalized
    });

    if (transactionType === TransactionType.Verify) {
        const verifyTransactionInfo = finalizedTransactionInfo as VerifyTransactionInfo;
        if (verifyTransactionInfo.attestationId) {
            emitter.emit(ZkVerifyEvents.Finalized, verifyTransactionInfo);
        } else {
            emitter.emit(ZkVerifyEvents.ErrorEvent, { ...verifyTransactionInfo, error: 'Finalized but no attestation ID found.' });
        }
    } else if (transactionType === TransactionType.VKRegistration) {
        const vkRegistrationInfo = finalizedTransactionInfo as VKRegistrationTransactionInfo;
        if (vkRegistrationInfo.statementHash) {
            emitter.emit(ZkVerifyEvents.Finalized, vkRegistrationInfo);
        } else {
            emitter.emit(ZkVerifyEvents.ErrorEvent, { ...vkRegistrationInfo, error: 'Finalized but no statement hash found.' });
        }
    }

    return finalizedTransactionInfo;
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

    return new Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo>((resolve, reject) => {
        submitExtrinsic
            .signAndSend(account, { nonce }, async (result: SubmittableResult) => {
                try {
                    if (result.status.isInBlock) {
                        transactionInfo.txHash = result.txHash.toString();
                        transactionInfo.blockHash = result.status.asInBlock.toString();
                        transactionInfo = await handleInBlock(api, result.events, proofType, transactionInfo.blockHash, transactionInfo.txHash, setAttestationId, emitter, transactionType);

                        if (transactionType === TransactionType.Verify && shouldWaitForAttestation && (transactionInfo as VerifyTransactionInfo).attestationId) {
                            attestationPromise = waitForNewAttestationEvent(api, (transactionInfo as VerifyTransactionInfo).attestationId!, emitter);
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

                        return resolveTransaction(resolve, transactionInfo);
                    }

                    if (!result.status.isFinalized) {
                        if (result.status.isDropped || result.status.isInvalid || result.status.isRetracted || result.status.isUsurped) {
                            handleError(emitter, api, transactionInfo as VerifyTransactionInfo | VKRegistrationTransactionInfo, new Error('Transaction encountered an issue.'), result.status);
                        }
                    }
                } catch (error) {
                    handleError(emitter, api, transactionInfo as VerifyTransactionInfo | VKRegistrationTransactionInfo, error);
                    reject(error);
                }
            });
    });
};

const resolveTransaction = (
    resolve: (value: VerifyTransactionInfo | VKRegistrationTransactionInfo) => void,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo
) => {
    resolve(transactionInfo);
};

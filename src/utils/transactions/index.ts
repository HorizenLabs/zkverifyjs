import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../../types";
import { waitForNewAttestationEvent } from "../helpers";
import { handleTransactionEvents } from "./events";
import { VerifyOptions } from "../../session/types";
import { TransactionStatus, TransactionType, ZkVerifyEvents } from "../../enums";
import { handleError } from "./errors";

const safeEmit = (emitter: EventEmitter, event: string, data: any) => {
    try {
        emitter.emit(event, data);
    } catch (error) {
        console.debug(`Failed to emit event ${event}:`, error);
    }
};

const handleInBlock = async (
    api: ApiPromise,
    events: SubmittableResult['events'],
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo,
    setAttestationId: (id: number | undefined) => void,
    emitter: EventEmitter,
    transactionType: TransactionType
): Promise<void> => {
    transactionInfo.status = TransactionStatus.InBlock;

    const updatedTransactionInfo = handleTransactionEvents(api, events, transactionInfo, emitter, setAttestationId, transactionType);
    Object.assign(transactionInfo, updatedTransactionInfo);

    safeEmit(emitter, ZkVerifyEvents.IncludedInBlock, transactionInfo);
};

const handleFinalized = async (
    api: ApiPromise,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo,
    dispatchError: any,
    emitter: EventEmitter,
    transactionType: TransactionType
): Promise<void> => {
    if (dispatchError) {
        handleError(emitter, api, transactionInfo, dispatchError);
        return;
    }

    transactionInfo.status = TransactionStatus.Finalized;

    if (transactionType === TransactionType.Verify) {
        const verifyTransactionInfo = transactionInfo as VerifyTransactionInfo;
        if (verifyTransactionInfo.attestationId) {
            safeEmit(emitter, ZkVerifyEvents.Finalized, verifyTransactionInfo);
        } else {
            safeEmit(emitter, ZkVerifyEvents.ErrorEvent, { ...verifyTransactionInfo, error: 'Finalized but no attestation ID found.' });
        }
    } else if (transactionType === TransactionType.VKRegistration) {
        const vkRegistrationInfo = transactionInfo as VKRegistrationTransactionInfo;
        if (vkRegistrationInfo.statementHash) {
            safeEmit(emitter, ZkVerifyEvents.Finalized, vkRegistrationInfo);
        } else {
            safeEmit(emitter, ZkVerifyEvents.ErrorEvent, { ...vkRegistrationInfo, error: 'Finalized but no statement hash found.' });
        }
    }
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

    let transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo = {
        blockHash: '',
        proofType,
        status: TransactionStatus.Pending,
        txHash: undefined,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
    } as VerifyTransactionInfo | VKRegistrationTransactionInfo;

    const setAttestationId = (id: number | undefined) => {
        (transactionInfo as VerifyTransactionInfo).attestationId = id;
    };

    return new Promise<VerifyTransactionInfo | VKRegistrationTransactionInfo>((resolve, reject) => {
        submitExtrinsic
            .signAndSend(account, { nonce }, async (result: SubmittableResult) => {
                try {
                    if (result.status.isInBlock) {
                        transactionInfo.txHash = result.txHash.toString();
                        transactionInfo.blockHash = result.status.asInBlock.toString();

                        await handleInBlock(api, result.events, transactionInfo, setAttestationId, emitter, transactionType);

                        if (result.status.isFinalized) {
                            await handleFinalized(api, transactionInfo, result.dispatchError, emitter, transactionType);

                            if (transactionType === TransactionType.Verify && shouldWaitForAttestation && (transactionInfo as VerifyTransactionInfo).attestationId) {
                                try {
                                    (transactionInfo as VerifyTransactionInfo).attestationEvent = await waitForNewAttestationEvent(api, (transactionInfo as VerifyTransactionInfo).attestationId!, emitter);
                                    (transactionInfo as VerifyTransactionInfo).attestationConfirmed = true;
                                } catch (error) {
                                    return reject(error);
                                }
                            }

                            return resolveTransaction(resolve, transactionInfo);
                        }
                    } else if (result.status.isFinalized) {
                        await handleFinalized(api, transactionInfo, result.dispatchError, emitter, transactionType);

                        if (transactionType === TransactionType.Verify && shouldWaitForAttestation && (transactionInfo as VerifyTransactionInfo).attestationId) {
                            try {
                                (transactionInfo as VerifyTransactionInfo).attestationEvent = await waitForNewAttestationEvent(api, (transactionInfo as VerifyTransactionInfo).attestationId!, emitter);
                                (transactionInfo as VerifyTransactionInfo).attestationConfirmed = true;
                            } catch (error) {
                                return reject(error);
                            }
                        }

                        return resolveTransaction(resolve, transactionInfo);
                    } else if (result.status.isInvalid) {
                        return reject(new Error('Transaction is invalid.'));
                    }
                } catch (error) {
                    handleError(emitter, api, transactionInfo, error);
                    reject(error);
                }
            }).catch(reject);
    });
};

const resolveTransaction = (
    resolve: (value: VerifyTransactionInfo | VKRegistrationTransactionInfo) => void,
    transactionInfo: VerifyTransactionInfo | VKRegistrationTransactionInfo
) => {
    resolve(transactionInfo);
};

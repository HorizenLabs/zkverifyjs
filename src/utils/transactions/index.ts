import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { ProofTransactionResult, TransactionInfo } from "../../types";
import { waitForNewAttestation } from "../helpers";
import { decodeDispatchError } from "./errors";
import { handleTransactionEvents } from "./events";

const handleInBlock = (
    api: ApiPromise,
    events: SubmittableResult['events'],
    proofType: string,
    blockHash: string,
    txHash: string,
    setAttestationId: (id: string | null) => void,
    emitter: EventEmitter
): TransactionInfo => {
    let transactionInfo: TransactionInfo = {
        blockHash,
        proofType,
        attestationId: null,
        proofLeaf: null,
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
    proofType: string,
    emitter: EventEmitter,
    waitForNewAttestationEvent: boolean = false
): Promise<ProofTransactionResult> => {
    let transactionInfo: TransactionInfo = {
        blockHash: '',
        proofType,
        attestationId: null,
        proofLeaf: null,
        status: 'inBlock',
        txHash: undefined,
        extrinsicIndex: undefined,
        feeInfo: undefined,
        weightInfo: undefined,
        txClass: undefined,
    };

    const setAttestationId = (id: string | null) => {
        transactionInfo.attestationId = id;
    };

    return new Promise<{
        finalized: boolean;
        attestationConfirmed: boolean;
        transactionInfo: TransactionInfo;
    }>((resolve, reject) => {
        submitProof.signAndSend(account, async (result: SubmittableResult) => {
            try {
                if (result.status.isInBlock) {
                    transactionInfo.txHash = result.txHash.toString();
                    transactionInfo.blockHash = result.status.asInBlock.toString();
                    transactionInfo = handleInBlock(api, result.events, proofType, transactionInfo.blockHash, transactionInfo.txHash, setAttestationId, emitter);
                }

                if (result.status.isFinalized) {
                    transactionInfo = await handleFinalized(api, transactionInfo, result.dispatchError, emitter);
                    const finalized = !!transactionInfo;

                    let attestationConfirmed = false;
                    if (waitForNewAttestationEvent && finalized && transactionInfo.attestationId) {
                        attestationConfirmed = await waitForNewAttestation(api, transactionInfo.attestationId, emitter);
                    }

                    resolveTransaction(resolve, finalized, attestationConfirmed, transactionInfo);
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

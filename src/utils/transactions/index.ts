import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { handleEvents, waitForNewAttestation } from '../helpers';
import { EventEmitter } from 'events';

const decodeDispatchError = (api: ApiPromise, dispatchError: any): string => {
    if (dispatchError.isModule) {
        const decoded = api.registry.findMetaError(dispatchError.asModule);
        const { docs, name, section } = decoded;
        return `${section}.${name}: ${docs.join(' ')}`;
    } else {
        return dispatchError.toString();
    }
};

interface BlockInfo {
    blockHash: string;
    proofType: string;
    attestationId: string | null;
    proofLeaf: string | null;
    status: 'inBlock' | 'finalized';
}

const createBlockInfo = (
    proofType: string,
    blockHash: string,
    attestationId: string | null,
    proofLeaf: string | null,
    status: 'inBlock' | 'finalized'
): BlockInfo => {
    return {
        blockHash,
        proofType,
        attestationId,
        proofLeaf,
        status,
    };
};

const handleInBlock = (
    events: any[],
    proofType: string,
    blockHash: string,
    setAttestationId: (id: string | null) => void,
    emitter: EventEmitter
): BlockInfo => {
    let attestationId: string | null = null;
    let proofLeaf: string | null = null;

    handleEvents(events, (data) => {
        if (data && data.length > 1) {
            attestationId = data[1].toString();
            proofLeaf = data[0].toString();
            setAttestationId(attestationId);
        }
    });

    const blockInfo = createBlockInfo(proofType, blockHash, attestationId, proofLeaf, 'inBlock');
    emitter.emit('includedInBlock', blockInfo);
    return blockInfo;
};

const handleFinalized = async (
    proofType: string,
    attestationId: string | null,
    blockHash: string | null,
    proofLeaf: string | null,
    dispatchError: any,
    api: ApiPromise,
    emitter: EventEmitter
): Promise<BlockInfo | null> => {
    if (dispatchError) {
        const decodedError = decodeDispatchError(api, dispatchError);
        emitter.emit('error', { proofType, error: decodedError });

        return null;
    }

    const blockInfo = createBlockInfo(proofType, blockHash || '', attestationId, proofLeaf, 'finalized');

    if (attestationId) {
        emitter.emit('finalized', blockInfo);
    } else {
        emitter.emit('error', { ...blockInfo, error: 'Finalized but no attestation ID found.' });
    }

    return blockInfo;
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
}> => {
    let attestationId: string | null = null;
    let blockHash: string | null = null;
    let proofLeaf: string | null = null;

    const setAttestationId = (id: string | null) => {
        attestationId = id;
    };

    return new Promise<{
        finalized: boolean;
        attestationConfirmed: boolean;
        attestationId: string | null;
        blockHash: string | null;
        proofLeaf: string | null;
    }>((resolve, reject) => {
        submitProof.signAndSend(account, async ({ events, status, dispatchError }) => {
            try {
                if (dispatchError) {
                    const decodedError = decodeDispatchError(api, dispatchError);
                    emitter.emit('error', { proofType, error: decodedError });
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                    });

                    return;
                }

                if (status.isInBlock) {
                    const blockInfo = handleInBlock(events, proofType, status.asInBlock.toString(), setAttestationId, emitter);
                    blockHash = blockInfo.blockHash;
                    proofLeaf = blockInfo.proofLeaf;
                }

                if (status.isFinalized) {
                    const blockInfo = await handleFinalized(proofType, attestationId, blockHash, proofLeaf, dispatchError, api, emitter);
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
                    });
                } else if (status.isDropped || status.isInvalid) {
                    emitter.emit('error', new Error('Transaction was dropped or marked as invalid.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                    });
                } else if (status.isRetracted) {
                    emitter.emit('error', new Error('Transaction was retracted.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                    });
                } else if (status.isUsurped) {
                    emitter.emit('error', new Error('Transaction was replaced by another transaction with the same nonce.'));
                    resolve({
                        finalized: false,
                        attestationConfirmed: false,
                        attestationId,
                        blockHash,
                        proofLeaf,
                    });
                } else if (status.isBroadcast) {
                    emitter.emit('broadcast', { proofType, status: 'Transaction broadcasted.' });
                }
            } catch (error) {
                reject(error);
            }
        });
    });
};

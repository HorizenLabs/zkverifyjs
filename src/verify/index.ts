import { submitProof } from '../utils/helpers';
import { handleTransaction } from '../utils/transactions';
import { proofTypeToPallet } from '../config';
import { AccountConnection } from '../connection/types';
import { EventEmitter } from 'events';
import { getProofProcessor } from '../utils/helpers';
import { ProofTransactionResult } from "../types";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {KeyringPair} from "@polkadot/keyring/types";

async function executeProofTransaction(
    connection: AccountConnection,
    proofType: string,
    emitter: EventEmitter,
    waitForAttestation: boolean,
    ...proofData: any[]
): Promise<ProofTransactionResult> {
    if (!proofType) {
        throw new Error('Proof type is required.');
    }

    const processor = await getProofProcessor(proofType);

    if (!processor) {
        throw new Error(`Unsupported proof type: ${proofType}`);
    }

    const { formattedProof, formattedVk, formattedPubs } = processor.processProofData(...proofData);

    const proofParams = [
        { 'Vk': formattedVk },
        formattedProof,
        formattedPubs
    ];

    const { api, account } = connection;

    try {
        const pallet = proofTypeToPallet[proofType.trim()];
        if (!pallet) {
            throw new Error(`Unsupported proof type: ${proofType}`);
        }

        const transaction = submitProof(api, pallet, proofParams);

        return await handleTransaction(api, transaction, account, proofType, emitter, waitForAttestation);
    } catch (error) {
        throw new Error(`Failed to send proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function verify(
    connection: { provider: WsProvider; api: ApiPromise; account: KeyringPair },
    proofType: string,
    emitter: EventEmitter,
    ...proofData: any[]
): Promise<ProofTransactionResult> {
    return executeProofTransaction(connection, proofType, emitter, false, ...proofData);
}

export async function verifyAndWaitForAttestationEvent(
    connection: AccountConnection,
    proofType: string,
    emitter: EventEmitter,
    ...proofData: any[]
): Promise<ProofTransactionResult> {
    return executeProofTransaction(connection, proofType, emitter, true, ...proofData);
}

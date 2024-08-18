import { submitProof } from '../utils/helpers';
import { handleTransaction } from '../utils/transactions';
import { proofTypeToPallet } from '../config';
import { AccountConnection } from '../connection/types';
import { EventEmitter } from 'events';
import { getProofProcessor } from '../utils/helpers';
import { ProofTransactionResult } from "../types";
import { VerifyOptions } from "../session/types";

export async function verify(
    connection: AccountConnection,
    options: VerifyOptions,
    emitter: EventEmitter,
    ...proofData: any[]
): Promise<ProofTransactionResult> {
    if (!options.proofType) {
        throw new Error('Proof type is required.');
    }

    const processor = await getProofProcessor(options.proofType);

    if (!processor) {
        throw new Error(`Unsupported proof type: ${options.proofType}`);
    }

    const { formattedProof, formattedVk, formattedPubs } = processor.processProofData(...proofData);

    const proofParams = [
        { 'Vk': formattedVk },
        formattedProof,
        formattedPubs
    ];

    const { api, account } = connection;

    try {
        const pallet = proofTypeToPallet[options.proofType.trim()];
        if (!pallet) {
            throw new Error(`Unsupported proof type: ${options.proofType}`);
        }

        const transaction = submitProof(api, pallet, proofParams);

        return await handleTransaction(api, transaction, account, emitter, options)
    } catch (error) {
        throw new Error(`Failed to send proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

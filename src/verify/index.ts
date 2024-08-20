import { getProofProcessor, submitProofExtrinsic } from '../utils/helpers';
import { handleTransaction } from '../utils/transactions';
import { proofTypeToPallet } from '../config';
import { AccountConnection } from '../connection/types';
import { EventEmitter } from 'events';
import { VerifyTransactionInfo } from "../types";
import { VerifyOptions } from "../session/types";
import { TransactionType } from "../enums";

export async function verify(
    connection: AccountConnection,
    options: VerifyOptions,
    emitter: EventEmitter,
    ...proofData: any[]
): Promise<VerifyTransactionInfo> {
    if (!options.proofType) {
        throw new Error('Proof type is required.');
    }

    const processor = await getProofProcessor(options.proofType);

    if (!processor) {
        throw new Error(`Unsupported proof type: ${options.proofType}`);
    }

    const [proof, publicSignals, vk] = proofData;

    if (!proof || !publicSignals || !vk) {
        throw new Error('Proof, publicSignals, and vk are required and cannot be null or undefined.');
    }

    const formattedProof = processor.formatProof(proof);
    const formattedPubs = processor.formatPubs(publicSignals);

    let formattedVk;
    if (typeof vk === 'string' && vk.startsWith('0x')) {
        formattedVk = { 'Hash': vk };
    } else {
        formattedVk = { 'Vk': processor.formatVk(vk) };
    }

    const proofParams = [
        formattedVk,
        formattedProof,
        formattedPubs
    ];

    const { api, account } = connection;

    try {
        const pallet = proofTypeToPallet[options.proofType.trim()];
        if (!pallet) {
            throw new Error(`Unsupported proof type: ${options.proofType}`);
        }

        const transaction = submitProofExtrinsic(api, pallet, proofParams);

        return await handleTransaction(api, transaction, account, emitter, options, TransactionType.Verify) as VerifyTransactionInfo;
    } catch (error) {
        throw new Error(`Failed to send proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

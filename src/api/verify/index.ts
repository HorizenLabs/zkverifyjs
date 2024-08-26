import { getProofProcessor, submitProofExtrinsic } from '../../utils/helpers';
import { handleTransaction } from '../../utils/transactions';
import { proofTypeToPallet } from '../../config';
import { AccountConnection } from '../connection/types';
import { EventEmitter } from 'events';
import { ProofProcessor, VerifyTransactionInfo } from '../../types';
import { VerifyOptions } from '../../session/types';
import { TransactionType, ZkVerifyEvents } from '../../enums';

export async function verify(
  connection: AccountConnection,
  options: VerifyOptions,
  emitter: EventEmitter,
  ...proofData: unknown[]
): Promise<VerifyTransactionInfo> {
  try {
    if (!options.proofType) {
      throw new Error('Proof type is required.');
    }

    const processor: ProofProcessor = await getProofProcessor(
      options.proofType,
    );

    if (!processor) {
      throw new Error(`Unsupported proof type: ${options.proofType}`);
    }

    const [proof, publicSignals, vk] = proofData;

    if (!proof || !publicSignals) {
      throw new Error(
        `${options.proofType}: Proof and publicSignals are required and cannot be null or undefined.`,
      );
    }

    if (!vk) {
      throw new Error(
        `${options.proofType}: Either Verification Key must be provided.`,
      );
    }

    let formattedProof, formattedPubs, formattedVk;

    try {
      formattedProof = processor.formatProof(proof);
    } catch (error) {
      const proofSnippet =
        typeof proof === 'string'
          ? proof.slice(0, 50)
          : JSON.stringify(proof).slice(0, 50);
      throw new Error(
        `Failed to format ${options.proofType} proof: ${error instanceof Error ? error.message : 'Unknown error'}. Proof snippet: "${proofSnippet}..."`,
      );
    }

    try {
      formattedPubs = processor.formatPubs(publicSignals);
    } catch (error) {
      const pubsSnippet = Array.isArray(publicSignals)
        ? JSON.stringify(publicSignals).slice(0, 50)
        : publicSignals?.toString().slice(0, 50);

      throw new Error(
        `Failed to format ${options.proofType} public signals: ${error instanceof Error ? error.message : 'Unknown error'}. Public signals snippet: "${pubsSnippet}..."`,
      );
    }

    try {
      if (options.registeredVk) {
        formattedVk = { Hash: vk };
      } else {
        formattedVk = { Vk: processor.formatVk(vk) };
      }
    } catch (error) {
      const vkSnippet =
        typeof vk === 'string'
          ? vk.slice(0, 50)
          : JSON.stringify(vk).slice(0, 50);

      throw new Error(
        `Failed to format ${options.proofType} verification key: ${error instanceof Error ? error.message : 'Unknown error'}. Verification key snippet: "${vkSnippet}..."`,
      );
    }

    const proofParams = [formattedVk, formattedProof, formattedPubs];
    const { api, account } = connection;

    try {
      const pallet = proofTypeToPallet[options.proofType.trim()];
      if (!pallet) {
        throw new Error(`Unsupported proof type: ${options.proofType}`);
      }

      const transaction = submitProofExtrinsic(api, pallet, proofParams);

      const result = await handleTransaction(
        api,
        transaction,
        account,
        emitter,
        options,
        TransactionType.Verify,
      );

      return result as VerifyTransactionInfo;
    } catch (error) {
      emitter.emit(ZkVerifyEvents.ErrorEvent, error);
      throw new Error(
        `Failed to send ${options.proofType} proof: ${error instanceof Error ? error.message : `${options.proofType}: Unknown error`}`,
      );
    }
  } catch (error) {
    emitter.emit(ZkVerifyEvents.ErrorEvent, error);
    emitter.removeAllListeners();
    throw error;
  }
}

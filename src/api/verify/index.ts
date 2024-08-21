import { getProofProcessor, submitProofExtrinsic } from '../../utils/helpers';
import { handleTransaction } from '../../utils/transactions';
import { proofTypeToPallet } from '../../config';
import { AccountConnection } from '../../connection/types';
import { EventEmitter } from 'events';
import { ProofProcessor, VerifyTransactionInfo } from '../../types';
import { VerifyOptions } from '../../session/types';
import { TransactionType } from '../../enums';

export async function verify(
  connection: AccountConnection,
  options: VerifyOptions,
  emitter: EventEmitter,
  ...proofData: unknown[]
): Promise<VerifyTransactionInfo> {
  if (!options.proofType) {
    throw new Error('Proof type is required.');
  }

  const processor: ProofProcessor = await getProofProcessor(options.proofType);

  if (!processor) {
    throw new Error(`Unsupported proof type: ${options.proofType}`);
  }

  const [proof, publicSignals, vk] = proofData;

  if (!proof || !publicSignals) {
    throw new Error(
      'Proof and publicSignals are required and cannot be null or undefined.',
    );
  }

  if (!options.registeredVk && !vk) {
    throw new Error('Either vk or registeredVk must be provided.');
  } else if (options.registeredVk && vk) {
    throw new Error('Cannot provide both registeredVk option and Vk data.');
  }

  let formattedProof, formattedPubs, formattedVk;

  try {
    formattedProof = processor.formatProof(proof);
  } catch (error) {
    throw new Error(
      `Failed to format proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  try {
    formattedPubs = processor.formatPubs(publicSignals);
  } catch (error) {
    throw new Error(
      `Failed to format public signals: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  try {
    if (options.registeredVk) {
      formattedVk = { Hash: options.registeredVk };
    } else {
      formattedVk = { Vk: processor.formatVk(vk) };
    }
  } catch (error) {
    throw new Error(
      `Failed to format verification key: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    return (await handleTransaction(
      api,
      transaction,
      account,
      emitter,
      options,
      TransactionType.Verify,
    )) as VerifyTransactionInfo;
  } catch (error) {
    throw new Error(
      `Failed to send proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

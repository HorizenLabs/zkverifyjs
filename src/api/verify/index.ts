import { handleTransaction } from '../../utils/transactions';
import { AccountConnection, WalletConnection } from '../connection/types';
import { EventEmitter } from 'events';
import { VerifyTransactionInfo } from '../../types';
import { VerifyOptions } from '../../session/types';
import { TransactionType, ZkVerifyEvents } from '../../enums';
import { format } from '../format';
import { createSubmittableExtrinsic } from '../extrinsic';
import { VerifyInput } from './types';
import { ProofData } from '../../types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { FormattedProofData } from '../format/types';

export const verify = async (
  connection: AccountConnection | WalletConnection,
  options: VerifyOptions,
  emitter: EventEmitter,
  input: VerifyInput,
): Promise<VerifyTransactionInfo> => {
  try {
    if (!options.proofType) {
      throw new Error('Proof type is required.');
    }

    const { api } = connection;
    let transaction: SubmittableExtrinsic<'promise'>;

    if ('proofData' in input && input.proofData) {
      const { proof, publicSignals, vk } = input.proofData as ProofData;

      const formattedProofData: FormattedProofData = format(
        options.proofType,
        proof,
        publicSignals,
        vk,
        options.registeredVk,
      );

      transaction = createSubmittableExtrinsic(
        api,
        options.proofType,
        formattedProofData,
      );
    } else if ('extrinsic' in input && input.extrinsic) {
      transaction = input.extrinsic;
    } else {
      throw new Error(
        'Invalid input: Either proofData or extrinsic must be provided.',
      );
    }

    const result = await (async () => {
      if ('account' in connection) {
        return await handleTransaction(
          api,
          transaction,
          connection.account,
          undefined,
          emitter,
          options,
          TransactionType.Verify,
        );
      } else if ('injector' in connection) {
        const { signer } = connection.injector;
        const { accountAddress } = connection;

        return await handleTransaction(
          api,
          transaction,
          accountAddress,
          signer,
          emitter,
          options,
          TransactionType.Verify,
        );
      } else {
        throw new Error('Unsupported connection type.');
      }
    })();

    return result as VerifyTransactionInfo;
  } catch (error) {
    emitter.emit(ZkVerifyEvents.ErrorEvent, error);
    emitter.removeAllListeners();
    throw error;
  }
};

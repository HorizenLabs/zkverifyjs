import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'events';
import { SubmittableResult } from '@polkadot/api';
import {
  TransactionInfo,
  VerifyTransactionInfo,
  VKRegistrationTransactionInfo,
} from '../../../types';
import { decodeDispatchError } from '../errors';
import { TransactionType, ZkVerifyEvents } from '../../../enums';
import { proofTypeToPallet } from '../../../config';

export const handleTransactionEvents = (
  api: ApiPromise,
  events: SubmittableResult['events'],
  transactionInfo: TransactionInfo,
  emitter: EventEmitter,
  setAttestationId: (id: number | undefined) => void,
  transactionType: TransactionType,
): VerifyTransactionInfo | VKRegistrationTransactionInfo => {
  let statementHash: string | undefined;
  let attestationId: number | undefined = undefined;
  let leafDigest: string | null = null;

  events.forEach(({ event, phase }) => {
    if (phase.isApplyExtrinsic) {
      transactionInfo.extrinsicIndex = phase.asApplyExtrinsic.toNumber();
    }

    if (
      event.section === 'transactionPayment' &&
      event.method === 'TransactionFeePaid'
    ) {
      transactionInfo.feeInfo = {
        payer: event.data[0].toString(),
        actualFee: event.data[1].toString(),
        tip: event.data[2].toString(),
        paysFee: 'Yes',
      };
    }

    if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
      const dispatchInfo = event.data[0] as any;
      transactionInfo.weightInfo = {
        refTime: dispatchInfo.weight.refTime?.toString(),
        proofSize: dispatchInfo.weight.proofSize?.toString(),
      };
      transactionInfo.txClass = dispatchInfo.class.toString();

      if (transactionInfo.feeInfo) {
        transactionInfo.feeInfo.paysFee = dispatchInfo.paysFee.toString();
      }
    }

    if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
      const [dispatchError] = event.data;
      const decodedError = decodeDispatchError(api, dispatchError);
      emitter.emit(
        ZkVerifyEvents.ErrorEvent,
        new Error(`Transaction failed with error: ${decodedError}`),
      );
    }

    if (
      transactionType === TransactionType.Verify &&
      event.section === 'poe' &&
      event.method === 'NewElement'
    ) {
      attestationId = Number(event.data[1]);
      leafDigest = event.data[0].toString();
      setAttestationId(attestationId);
    }

    if (
      transactionType === TransactionType.VKRegistration &&
      event.section == proofTypeToPallet[transactionInfo.proofType] &&
      event.method == 'VkRegistered'
    ) {
      statementHash = event.data[0].toString();
    }
  });

  if (transactionType === TransactionType.Verify) {
    return {
      ...transactionInfo,
      attestationId,
      leafDigest,
      attestationConfirmed: false,
    } as VerifyTransactionInfo;
  }

  return {
    ...transactionInfo,
    statementHash,
  } as VKRegistrationTransactionInfo;
};

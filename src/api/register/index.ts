import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventEmitter } from 'events';
import { handleTransaction } from '../../utils/transactions';
import { getProofProcessor } from '../../utils/helpers';
import { VKRegistrationTransactionInfo } from "../../types";
import { proofTypeToPallet } from "../../config";
import { TransactionType, ZkVerifyEvents } from "../../enums";
import { AccountConnection } from '../../connection/types';
import { VerifyOptions } from '../../session/types';

export async function registerVk(
    connection: AccountConnection,
    options: VerifyOptions,
    verificationKey: any
): Promise<{ events: EventEmitter; transactionResult: Promise<VKRegistrationTransactionInfo>; }> {
    const { proofType } = options;
    const emitter = new EventEmitter();

    const processor = await getProofProcessor(proofType);

    if (!processor) {
        throw new Error(`Unsupported proof type: ${proofType}`);
    }

    const { formattedVk } = processor.formatVk(verificationKey);

    const pallet = proofTypeToPallet[proofType.trim()];
    if (!pallet) {
        throw new Error(`Unsupported proof type: ${proofType}`);
    }

    const registerExtrinsic: SubmittableExtrinsic<"promise"> = connection.api.tx[pallet].registerVk(formattedVk);

    const transactionResult = new Promise<VKRegistrationTransactionInfo>((resolve, reject) => {
        handleTransaction(connection.api, registerExtrinsic, connection.account, emitter, options, TransactionType.VKRegistration)
            .then(resolve)
            .catch((error) => {
                emitter.emit(ZkVerifyEvents.ErrorEvent, error);
                reject(error);
            });
    });

    return { events: emitter, transactionResult };
}

import { registerVk } from './index';
import { EventEmitter } from 'events';
import { getProofPallet, getProofProcessor } from '../../utils/helpers';
import { handleTransaction } from '../../utils/transactions';
import { AccountConnection } from '../connection/types';
import { VerifyOptions } from '../../session/types';
import { TransactionType, ZkVerifyEvents } from '../../enums';
import { ProofType } from '../../config';

jest.mock('../../utils/helpers', () => ({
  getProofPallet: jest.fn(),
  getProofProcessor: jest.fn(),
}));
jest.mock('../../utils/transactions', () => ({
  handleTransaction: jest.fn(),
}));

describe('registerVk', () => {
  let connection: AccountConnection;
  let mockOptions: VerifyOptions;
  let mockVerificationKey: unknown;
  let mockProcessor: { formatVk: jest.Mock };
  let mockPallet: string;
  let mockExtrinsic: { signAndSend: jest.Mock };

  beforeEach(() => {
    connection = {
      api: {
        tx: {
          mockPallet: {
            registerVk: jest.fn(),
          },
        },
      },
      account: 'mockAccount',
    } as unknown as AccountConnection;

    mockOptions = { proofType: ProofType.fflonk } as VerifyOptions;
    mockVerificationKey = 'mockVerificationKey';

    mockProcessor = {
      formatVk: jest.fn().mockReturnValue('formattedVk'),
    };

    mockPallet = 'mockPallet';
    mockExtrinsic = { signAndSend: jest.fn() };

    (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
    (getProofPallet as jest.Mock).mockReturnValue(mockPallet);

    (
      connection.api.tx[mockPallet].registerVk as unknown as jest.Mock
    ).mockReturnValue(mockExtrinsic);
  });

  it('should successfully register verification key and handle transaction', async () => {
    const mockTransactionInfo = { some: 'transactionInfo' };
    (handleTransaction as jest.Mock).mockResolvedValue(mockTransactionInfo);

    const { events, transactionResult } = await registerVk(
      connection,
      mockOptions,
      mockVerificationKey,
    );

    expect(getProofProcessor).toHaveBeenCalledWith(mockOptions.proofType);
    expect(getProofPallet).toHaveBeenCalledWith(mockOptions.proofType);
    expect(mockProcessor.formatVk).toHaveBeenCalledWith(mockVerificationKey);
    expect(connection.api.tx[mockPallet].registerVk).toHaveBeenCalledWith(
      'formattedVk',
    );

    expect(handleTransaction).toHaveBeenCalledWith(
      connection.api,
      mockExtrinsic,
      connection.account,
      undefined,
      expect.any(EventEmitter),
      mockOptions,
      TransactionType.VKRegistration,
    );

    await expect(transactionResult).resolves.toEqual(mockTransactionInfo);
  });

  it('should throw an error for unsupported proof type', async () => {
    (getProofProcessor as jest.Mock).mockResolvedValue(null);

    await expect(
      registerVk(connection, mockOptions, mockVerificationKey),
    ).rejects.toThrow(`Unsupported proof type: ${mockOptions.proofType}`);
  });

  it('should throw an error for invalid verification key', async () => {
    await expect(registerVk(connection, mockOptions, null)).rejects.toThrow(
      'verificationKey cannot be null, undefined, or an empty string',
    );

    await expect(registerVk(connection, mockOptions, '')).rejects.toThrow(
      'verificationKey cannot be null, undefined, or an empty string',
    );
  });

  it('should emit error event and reject if transaction fails', async () => {
    const mockError = new Error('Transaction failed');
    (handleTransaction as jest.Mock).mockRejectedValue(mockError);

    const { events, transactionResult } = await registerVk(
      connection,
      mockOptions,
      mockVerificationKey,
    );

    const errorHandler = jest.fn();
    events.on(ZkVerifyEvents.ErrorEvent, errorHandler);

    await expect(transactionResult).rejects.toThrow('Transaction failed');
    expect(errorHandler).toHaveBeenCalledWith(mockError);
  });
});

import {
  getProofPallet,
  getProofProcessor,
} from '../../utils/helpers';
import { handleTransaction } from '../../utils/transactions';
import { verify } from './index';
import { EventEmitter } from 'events';
import { AccountConnection, WalletConnection } from '../connection/types';
import { VerifyOptions } from '../../session/types';
import { TransactionType, ZkVerifyEvents } from '../../enums';
import { ProofProcessor } from '../../types';
import { ProofType } from '../../config';
import { VerifyInput } from './types';
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { createSubmittableExtrinsic } from "../extrinsic";

jest.mock('../../utils/helpers', () => ({
  getProofPallet: jest.fn(),
  getProofProcessor: jest.fn(),
}));
jest.mock('../../utils/transactions', () => ({
  handleTransaction: jest.fn(),
}));
jest.mock('../extrinsic', () => ({
  createSubmittableExtrinsic: jest.fn(),
}));

describe('verify', () => {
  let mockAccountConnection: AccountConnection;
  let mockWalletConnection: WalletConnection;
  let mockOptions: VerifyOptions;
  let emitter: EventEmitter;
  let mockProcessor: ProofProcessor;

  beforeEach(() => {
    mockAccountConnection = {
      api: { method: jest.fn() },
      provider: {},
      account: { address: 'mockAddress' },
    } as unknown as AccountConnection;

    mockWalletConnection = {
      api: { method: jest.fn() },
      provider: {},
      injector: { signer: {} },
      accountAddress: 'mockAddress',
    } as unknown as WalletConnection;

    mockOptions = {
      proofType: ProofType.fflonk,
      registeredVk: false,
    };

    emitter = new EventEmitter();
    mockProcessor = {
      formatProof: jest.fn(),
      formatPubs: jest.fn(),
      formatVk: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if proofType is not provided', async () => {
    const invalidOptions = { ...mockOptions, proofType: undefined } as Partial<VerifyOptions>;
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockAccountConnection, invalidOptions as VerifyOptions, emitter, input))
        .rejects.toThrow('Proof type is required.');
  });

  it('should throw an error if unsupported proofType is provided', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(null);
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow(`Unsupported proof type: ${mockOptions.proofType}`);
  });

  it('should throw an error if proofData is missing proof or publicSignals', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);

    await expect(
        verify(mockAccountConnection, mockOptions, emitter, { proofData: [null, 'signals', 'vk'] })
    ).rejects.toThrow(`${mockOptions.proofType}: Proof is required and cannot be null or undefined.`);

    await expect(
        verify(mockAccountConnection, mockOptions, emitter, { proofData: ['proof', null, 'vk'] })
    ).rejects.toThrow(`${mockOptions.proofType}: Public signals are required and cannot be null or undefined.`);
  });

  it('should throw an error if formatting proof fails', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw new Error('Formatting error');
    });
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow(`Failed to format ${mockOptions.proofType} proof: Formatting error. Proof snippet: "proof..."`);
  });

  it('should throw an error if formatting public signals fails', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw new Error('Formatting error');
    });
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow(`Failed to format ${mockOptions.proofType} public signals: Formatting error. Public signals snippet: "signals..."`);
  });

  it('should throw an error if getProofPallet returns undefined', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    (getProofPallet as jest.Mock).mockReturnValue(undefined);
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow(`Unsupported proof type: ${mockOptions.proofType}`);
  });

  it('should handle the transaction with AccountConnection when proofData is provided', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    (getProofPallet as jest.Mock).mockReturnValue('mockPallet');
    (createSubmittableExtrinsic as jest.Mock).mockReturnValue('mockTransaction');
    (handleTransaction as jest.Mock).mockResolvedValue({ success: true });
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    const result = await verify(mockAccountConnection, mockOptions, emitter, input);

    expect(result).toEqual({ success: true });
    expect(handleTransaction).toHaveBeenCalledWith(
        mockAccountConnection.api,
        'mockTransaction',
        mockAccountConnection.account,
        undefined,
        emitter,
        mockOptions,
        TransactionType.Verify,
    );
  });

  it('should handle the transaction with WalletConnection when extrinsic is provided', async () => {
    const mockExtrinsic = {} as SubmittableExtrinsic<'promise'>;
    const input: VerifyInput = { extrinsic: mockExtrinsic };
    (handleTransaction as jest.Mock).mockResolvedValue({ success: true });

    const result = await verify(mockWalletConnection, mockOptions, emitter, input);

    expect(result).toEqual({ success: true });
    expect(handleTransaction).toHaveBeenCalledWith(
        mockWalletConnection.api,
        mockExtrinsic,
        mockWalletConnection.accountAddress,
        mockWalletConnection.injector.signer,
        emitter,
        mockOptions,
        TransactionType.Verify,
    );
  });

  it('should throw an error if unsupported connection type is provided', async () => {
    const mockUnsupportedConnection = { api: {}, provider: {} } as unknown as AccountConnection;
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    await expect(verify(mockUnsupportedConnection, mockOptions, emitter, input))
        .rejects.toThrow('Unsupported connection type.');
  });

  it('should emit an error and throw if transaction submission fails', async () => {
    (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    (getProofPallet as jest.Mock).mockReturnValue('mockPallet');
    (createSubmittableExtrinsic as jest.Mock).mockReturnValue('mockTransaction');
    (handleTransaction as jest.Mock).mockRejectedValue(new Error('Transaction error'));
    const input: VerifyInput = { proofData: ['proof', 'signals', 'vk'] };

    const errorListener = jest.fn();
    emitter.on(ZkVerifyEvents.ErrorEvent, errorListener);

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow('Transaction error');

    expect(errorListener).toHaveBeenCalledWith(new Error('Transaction error'));
  });

  it('should throw an error and call emitter.removeAllListeners if both proofData and extrinsic are missing', async () => {
    const input: VerifyInput = {};
    const errorListener = jest.fn();

    emitter.on(ZkVerifyEvents.ErrorEvent, errorListener);
    emitter.removeAllListeners = jest.fn();

    await expect(verify(mockAccountConnection, mockOptions, emitter, input))
        .rejects.toThrow('Invalid input: Either proofData or extrinsic must be provided.');

    expect(errorListener).toHaveBeenCalledWith(new Error('Invalid input: Either proofData or extrinsic must be provided.'));
    expect(emitter.removeAllListeners).toHaveBeenCalled();
  });
});

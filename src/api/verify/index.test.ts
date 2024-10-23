import {
    getProofPallet,
    getProofProcessor,
    submitProofExtrinsic,
} from '../../utils/helpers';
import { handleTransaction } from '../../utils/transactions';
import { verify } from './index';
import { EventEmitter } from 'events';
import { AccountConnection, WalletConnection } from '../connection/types';
import { VerifyOptions } from '../../session/types';
import { TransactionType, ZkVerifyEvents } from '../../enums';
import { ProofProcessor } from '../../types';
import { ProofType } from "../../config";

jest.mock('../../utils/helpers', () => ({
    getProofPallet: jest.fn(),
    getProofProcessor: jest.fn(),
    submitProofExtrinsic: jest.fn(),
}));
jest.mock('../../utils/transactions', () => ({
    handleTransaction: jest.fn(),
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

        await expect(
            verify(mockAccountConnection, invalidOptions as VerifyOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow('Proof type is required.');
    });

    it('should throw an error if unsupported proofType is provided', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(null);

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow(`Unsupported proof type: ${mockOptions.proofType}`);
    });

    it('should throw an error if proof or publicSignals are missing', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, null, 'signals', 'vk'),
        ).rejects.toThrow(`${mockOptions.proofType}: Proof and publicSignals are required and cannot be null or undefined.`);

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', null, 'vk'),
        ).rejects.toThrow(`${mockOptions.proofType}: Proof and publicSignals are required and cannot be null or undefined.`);
    });

    it('should throw an error if formatting proof fails', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
            throw new Error('Formatting error');
        });

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow(`Failed to format ${mockOptions.proofType} proof: Formatting error. Proof snippet: "proof..."`);
    });

    it('should throw an error if formatting public signals fails', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
            throw new Error('Formatting error');
        });

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow(`Failed to format ${mockOptions.proofType} public signals: Formatting error. Public signals snippet: "signals..."`);
    });

    it('should throw an error if formatting verification key fails', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
            throw new Error('Formatting error');
        });

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow(`Failed to format ${mockOptions.proofType} verification key: Formatting error. Verification key snippet: "vk..."`);
    });

    it('should emit an error and throw if transaction submission fails', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (getProofPallet as jest.Mock).mockReturnValue('mockPallet');
        (submitProofExtrinsic as jest.Mock).mockReturnValue('mockTransaction');
        (handleTransaction as jest.Mock).mockRejectedValue(new Error('Transaction error'));

        const errorListener = jest.fn();
        emitter.on(ZkVerifyEvents.ErrorEvent, errorListener);

        await expect(
            verify(mockAccountConnection, mockOptions, emitter, 'proof', 'signals', 'vk'),
        ).rejects.toThrow('Failed to send fflonk proof: Transaction error');

        expect(errorListener).toHaveBeenCalledWith(new Error('Transaction error'));
    });

    it('should successfully handle the transaction with AccountConnection', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (getProofPallet as jest.Mock).mockReturnValue('mockPallet');
        (submitProofExtrinsic as jest.Mock).mockReturnValue('mockTransaction');
        (handleTransaction as jest.Mock).mockResolvedValue({ success: true });

        const result = await verify(
            mockAccountConnection,
            mockOptions,
            emitter,
            'proof',
            'signals',
            'vk',
        );

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

    it('should successfully handle the transaction with WalletConnection', async () => {
        (getProofProcessor as jest.Mock).mockResolvedValue(mockProcessor);
        (getProofPallet as jest.Mock).mockReturnValue('mockPallet');
        (submitProofExtrinsic as jest.Mock).mockReturnValue('mockTransaction');
        (handleTransaction as jest.Mock).mockResolvedValue({ success: true });

        const result = await verify(
            mockWalletConnection,
            mockOptions,
            emitter,
            'proof',
            'signals',
            'vk',
        );

        expect(result).toEqual({ success: true });
        expect(handleTransaction).toHaveBeenCalledWith(
            mockWalletConnection.api,
            'mockTransaction',
            mockWalletConnection.accountAddress,
            mockWalletConnection.injector.signer,
            emitter,
            mockOptions,
            TransactionType.Verify,
        );
    });
});

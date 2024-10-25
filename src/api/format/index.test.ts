import { ProofProcessor } from '../../types';
import { getProofProcessor } from "../../utils/helpers";
import { ProofType } from "../../config";
import { format } from './index';

jest.mock('../../utils/helpers', () => ({
    getProofProcessor: jest.fn(),
}));

describe('format', () => {
    let mockProcessor: ProofProcessor;

    beforeEach(() => {
        mockProcessor = {
            formatProof: jest.fn().mockReturnValue('formattedProof'),
            formatPubs: jest.fn().mockReturnValue('formattedPubs'),
            formatVk: jest.fn().mockReturnValue('formattedVk'),
        };
        (getProofProcessor as jest.Mock).mockReturnValue(mockProcessor);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error if unsupported proofType is provided', () => {
        (getProofProcessor as jest.Mock).mockReturnValue(null);

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Unsupported proof type: groth16');
    });

    it('should throw an error if proof is missing', () => {
        expect(() => format(ProofType.groth16, null, 'signals', 'vk'))
            .toThrow('groth16: Proof is required and cannot be null or undefined.');
    });

    it('should throw an error if public signals are missing', () => {
        expect(() => format(ProofType.groth16, 'proof', null, 'vk'))
            .toThrow('groth16: Public signals are required and cannot be null or undefined.');
    });

    it('should throw an error if verification key is missing', () => {
        expect(() => format(ProofType.groth16, 'proof', 'signals', null))
            .toThrow('groth16: Verification Key must be provided.');
    });

    it('should throw a formatted error if formatting proof fails', () => {
        (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
            throw new Error('Proof formatting error');
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 proof: Proof formatting error. Proof snippet: "proof..."');
    });

    it('should throw a formatted error if formatting public signals fails', () => {
        (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
            throw new Error('Public signals formatting error');
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 public signals: Public signals formatting error. Public signals snippet: "signals..."');
    });

    it('should throw a formatted error if formatting verification key fails', () => {
        (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
            throw new Error('Verification key formatting error');
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 verification key: Verification key formatting error. Verification key snippet: "vk..."');
    });

    it('should throw a generic error if formatting proof fails with a non-Error type', () => {
        (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
            throw 'Non-Error failure in proof';
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 proof: Unknown error. Proof snippet: "proof..."');
    });

    it('should throw a generic error if formatting public signals fails with a non-Error type', () => {
        (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
            throw 'Non-Error failure in public signals';
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 public signals: Unknown error. Public signals snippet: "signals..."');
    });

    it('should throw a generic error if formatting verification key fails with a non-Error type', () => {
        (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
            throw 'Non-Error failure in verification key';
        });

        expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk'))
            .toThrow('Failed to format groth16 verification key: Unknown error. Verification key snippet: "vk..."');
    });

    it('should return formatted values for non-registered verification key', () => {
        const [formattedVk, formattedProof, formattedPubs] = format(ProofType.groth16, 'proof', 'signals', 'vk');

        expect(formattedVk).toEqual({ Vk: 'formattedVk' });
        expect(formattedProof).toBe('formattedProof');
        expect(formattedPubs).toBe('formattedPubs');
        expect(mockProcessor.formatProof).toHaveBeenCalledWith('proof');
        expect(mockProcessor.formatPubs).toHaveBeenCalledWith('signals');
        expect(mockProcessor.formatVk).toHaveBeenCalledWith('vk');
    });

    it('should return formatted values for registered verification key', () => {
        const [formattedVk, formattedProof, formattedPubs] = format(ProofType.groth16, 'proof', 'signals', 'vk', true);

        expect(formattedVk).toEqual({ Hash: 'vk' });
        expect(formattedProof).toBe('formattedProof');
        expect(formattedPubs).toBe('formattedPubs');
        expect(mockProcessor.formatProof).toHaveBeenCalledWith('proof');
        expect(mockProcessor.formatPubs).toHaveBeenCalledWith('signals');
        expect(mockProcessor.formatVk).not.toHaveBeenCalled();
    });
});

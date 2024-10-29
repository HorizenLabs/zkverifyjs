import { ProofProcessor } from '../../types';
import { getProofProcessor } from '../../utils/helpers';
import { ProofType } from '../../config';
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

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Unsupported proof type: groth16',
    );
  });

  it('should throw an error if proof, public signals, or verification key is null, undefined, or empty', () => {
    expect(() => format(ProofType.groth16, null, 'signals', 'vk')).toThrow(
      'groth16: Proof is required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(ProofType.groth16, 'proof', null, 'vk')).toThrow(
      'groth16: Public signals are required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(ProofType.groth16, 'proof', 'signals', null)).toThrow(
      'groth16: Verification Key must be provided.',
    );

    expect(() => format(ProofType.groth16, '', 'signals', 'vk')).toThrow(
      'groth16: Proof is required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(ProofType.groth16, 'proof', '', 'vk')).toThrow(
      'groth16: Public signals are required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(ProofType.groth16, 'proof', 'signals', '')).toThrow(
      'groth16: Verification Key must be provided.',
    );
  });

  it('should throw a formatted error if formatting proof fails', () => {
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw new Error('Proof formatting error');
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 proof: Proof formatting error. Proof snippet: "proof..."',
    );
  });

  it('should throw a formatted error if formatting public signals fails', () => {
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw new Error('Public signals formatting error');
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 public signals: Public signals formatting error. Public signals snippet: "signals..."',
    );
  });

  it('should throw a formatted error if formatting verification key fails', () => {
    (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
      throw new Error('Verification key formatting error');
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 verification key: Verification key formatting error. Verification key snippet: "vk..."',
    );
  });

  it('should throw a generic error if formatting proof fails with a non-Error type', () => {
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw 'Non-Error failure in proof';
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 proof: Unknown error. Proof snippet: "proof..."',
    );
  });

  it('should throw a generic error if formatting public signals fails with a non-Error type', () => {
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw 'Non-Error failure in public signals';
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 public signals: Unknown error. Public signals snippet: "signals..."',
    );
  });

  it('should throw a generic error if formatting verification key fails with a non-Error type', () => {
    (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
      throw 'Non-Error failure in verification key';
    });

    expect(() => format(ProofType.groth16, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 verification key: Unknown error. Verification key snippet: "vk..."',
    );
  });

  it('should return formatted values for non-registered verification key', () => {
    const result = format(ProofType.groth16, 'proof', 'signals', 'vk');

    expect(result.formattedVk).toEqual({ Vk: 'formattedVk' });
    expect(result.formattedProof).toBe('formattedProof');
    expect(result.formattedPubs).toBe('formattedPubs');
    expect(mockProcessor.formatProof).toHaveBeenCalledWith('proof');
    expect(mockProcessor.formatPubs).toHaveBeenCalledWith('signals');
    expect(mockProcessor.formatVk).toHaveBeenCalledWith('vk');
  });

  it('should return formatted values for registered verification key', () => {
    const result = format(ProofType.groth16, 'proof', 'signals', 'vk', true);

    expect(result.formattedVk).toEqual({ Hash: 'vk' });
    expect(result.formattedProof).toBe('formattedProof');
    expect(result.formattedPubs).toBe('formattedPubs');
    expect(mockProcessor.formatProof).toHaveBeenCalledWith('proof');
    expect(mockProcessor.formatPubs).toHaveBeenCalledWith('signals');
    expect(mockProcessor.formatVk).not.toHaveBeenCalled();
  });

  it('should format public signals correctly when publicSignals is an array', () => {
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw new Error('Array public signals formatting error');
    });
    expect(() =>
      format(ProofType.groth16, 'proof', ['signal1', 'signal2'], 'vk'),
    ).toThrow(
      'Failed to format groth16 public signals: Array public signals formatting error. Public signals snippet: "["signal1","signal2"]..."',
    );
  });

  it('should throw a formatted error for non-string proof, publicSignals, and vk', () => {
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw new Error('Non-string proof error');
    });
    expect(() =>
      format(ProofType.groth16, { field: 'value' }, 'signals', 'vk'),
    ).toThrow(
      'Failed to format groth16 proof: Non-string proof error. Proof snippet: "{"field":"value"}..."',
    );
  });

  it('should handle non-array, non-string publicSignals object correctly', () => {
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw new Error('Object public signals error');
    });
    expect(() =>
      format(ProofType.groth16, 'proof', { key: 'value' }, 'vk'),
    ).toThrow(
      'Failed to format groth16 public signals: Object public signals error. Public signals snippet: "[object Object]..."',
    );
  });

  it('should handle non-string vk object correctly', () => {
    (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
      throw new Error('Object vk formatting error');
    });
    expect(() =>
      format(ProofType.groth16, 'proof', 'signals', { vkField: 'vkValue' }),
    ).toThrow(
      'Failed to format groth16 verification key: Object vk formatting error. Verification key snippet: "{"vkField":"vkValue"}..."',
    );
  });
});

import { ProofProcessor } from '../../types';
import { getProofProcessor } from '../../utils/helpers';
import { ProofType, Library, CurveType } from '../../config';
import { format } from './index';

jest.mock('../../utils/helpers', () => ({
  getProofProcessor: jest.fn(),
}));

describe('format', () => {
  let mockProcessor: ProofProcessor;

  const proofOptions = {
    proofType: ProofType.groth16,
    library: Library.snarkjs,
    curve: CurveType.bls12381,
  };

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

    expect(() =>
      format(
        { ...proofOptions, proofType: 'unsupportedType' as any },
        'proof',
        'signals',
        'vk',
      ),
    ).toThrow('Unsupported proof type: unsupportedType');
  });

  it('should throw an error if proof, public signals, or verification key is null, undefined, or empty', () => {
    expect(() => format(proofOptions, null, 'signals', 'vk')).toThrow(
      'groth16: Proof is required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(proofOptions, 'proof', null, 'vk')).toThrow(
      'groth16: Public signals are required and cannot be null, undefined, or an empty string.',
    );
    expect(() => format(proofOptions, 'proof', 'signals', null)).toThrow(
      'groth16: Verification Key must be provided.',
    );
  });

  it('should throw a formatted error if formatting proof fails', () => {
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw new Error('Proof formatting error');
    });

    expect(() => format(proofOptions, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 proof: Proof formatting error. Proof snippet: "proof..."',
    );
  });

  it('should throw a formatted error if formatting public signals fails', () => {
    (mockProcessor.formatPubs as jest.Mock).mockImplementation(() => {
      throw new Error('Public signals formatting error');
    });

    expect(() => format(proofOptions, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 public signals: Public signals formatting error. Public signals snippet: "signals..."',
    );
  });

  it('should throw a formatted error if formatting verification key fails', () => {
    (mockProcessor.formatVk as jest.Mock).mockImplementation(() => {
      throw new Error('Verification key formatting error');
    });

    expect(() => format(proofOptions, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 verification key: Verification key formatting error. Verification key snippet: "vk..."',
    );
  });

  it('should throw a generic error if formatting proof fails with a non-Error type', () => {
    (mockProcessor.formatProof as jest.Mock).mockImplementation(() => {
      throw 'Non-Error failure in proof';
    });

    expect(() => format(proofOptions, 'proof', 'signals', 'vk')).toThrow(
      'Failed to format groth16 proof: Unknown error. Proof snippet: "proof..."',
    );
  });

  it('should return formatted values for non-registered verification key', () => {
    const result = format(proofOptions, 'proof', 'signals', 'vk');

    expect(result.formattedVk).toEqual({ Vk: 'formattedVk' });
    expect(result.formattedProof).toBe('formattedProof');
    expect(result.formattedPubs).toBe('formattedPubs');
    expect(mockProcessor.formatProof).toHaveBeenCalledWith(
      'proof',
      proofOptions,
    );
    expect(mockProcessor.formatPubs).toHaveBeenCalledWith(
      'signals',
      proofOptions,
    );
    expect(mockProcessor.formatVk).toHaveBeenCalledWith('vk', proofOptions);
  });

  it('should return formatted values for registered verification key', () => {
    const result = format(proofOptions, 'proof', 'signals', 'vk', true);

    expect(result.formattedVk).toEqual({ Hash: 'vk' });
    expect(result.formattedProof).toBe('formattedProof');
    expect(result.formattedPubs).toBe('formattedPubs');
    expect(mockProcessor.formatProof).toHaveBeenCalledWith(
      'proof',
      proofOptions,
    );
    expect(mockProcessor.formatPubs).toHaveBeenCalledWith(
      'signals',
      proofOptions,
    );
    expect(mockProcessor.formatVk).not.toHaveBeenCalled();
  });

  it('should handle arrays in publicSignals correctly', () => {
    const result = format(proofOptions, 'proof', ['signal1', 'signal2'], 'vk');

    expect(result.formattedPubs).toBe('formattedPubs');
    expect(mockProcessor.formatPubs).toHaveBeenCalledWith(
      ['signal1', 'signal2'],
      proofOptions,
    );
  });

  it('should handle non-string verification key correctly', () => {
    const vkObject = { key: 'value' };
    const result = format(proofOptions, 'proof', 'signals', vkObject);

    expect(mockProcessor.formatVk).toHaveBeenCalledWith(vkObject, proofOptions);
  });
});

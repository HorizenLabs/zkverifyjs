import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';
import {
  createSubmitProofExtrinsic,
  createExtrinsicHex,
  createExtrinsicFromHex,
} from './index';
import { ProofType } from '../../config';
import { FormattedProofData } from '../format/types';

jest.mock('../../utils/helpers', () => ({
  ...jest.requireActual('../../utils/helpers'),
  getProofPallet: (proofType: ProofType) => {
    return proofType === ProofType.groth16
      ? 'settlementGroth16Pallet'
      : undefined;
  },
}));

const mockTxMethod = {
  submitProof: jest.fn().mockReturnValue({
    toHex: jest.fn().mockReturnValue('0x1234'),
  }),
};

const mockApi = {
  tx: {
    settlementGroth16Pallet: mockTxMethod,
  },
  createType: jest.fn().mockReturnValue({ type: 'Extrinsic' }),
} as unknown as ApiPromise;

describe('extrinsic utilities', () => {
  const proofParams: FormattedProofData = {
    formattedVk: 'vk_data',
    formattedProof: 'proof_data',
    formattedPubs: 'pub_data',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubmitProofExtrinsic', () => {
    it('should create a submittable extrinsic with the given formatted proof parameters', () => {
      const extrinsic = createSubmitProofExtrinsic(
        mockApi,
        ProofType.groth16,
        proofParams,
      );

      expect(mockTxMethod.submitProof).toHaveBeenCalledWith(
        proofParams.formattedVk,
        proofParams.formattedProof,
        proofParams.formattedPubs,
      );
      expect(extrinsic.toHex()).toBe('0x1234');
    });

    it('should throw an error if the proof type is unsupported', () => {
      expect(() => {
        createSubmitProofExtrinsic(mockApi, ProofType.fflonk, proofParams);
      }).toThrow('Unsupported proof type: fflonk');
    });

    it('should throw a formatted error if extrinsic creation fails', () => {
      mockTxMethod.submitProof.mockImplementationOnce(() => {
        throw new Error('Submission error');
      });

      expect(() =>
        createSubmitProofExtrinsic(mockApi, ProofType.groth16, proofParams),
      ).toThrow(
        'Error creating submittable extrinsic: groth16 Params: {\n  "formattedVk": "vk_data",\n  "formattedProof": "proof_data",\n  "formattedPubs": "pub_data"\n} Submission error',
      );
    });

    it('should handle non-Error types gracefully in formatError', () => {
      mockTxMethod.submitProof.mockImplementationOnce(() => {
        throw 'Unknown error';
      });

      expect(() =>
        createSubmitProofExtrinsic(mockApi, ProofType.groth16, proofParams),
      ).toThrow(
        'Error creating submittable extrinsic: groth16 Params: {\n  "formattedVk": "vk_data",\n  "formattedProof": "proof_data",\n  "formattedPubs": "pub_data"\n} An unknown error occurred',
      );
    });
  });

  describe('createExtrinsicHex', () => {
    it('should return the hex representation of a submittable extrinsic', () => {
      const hex = createExtrinsicHex(mockApi, ProofType.groth16, proofParams);

      expect(mockTxMethod.submitProof).toHaveBeenCalledWith(
        proofParams.formattedVk,
        proofParams.formattedProof,
        proofParams.formattedPubs,
      );
      expect(hex).toBe('0x1234');
    });

    it('should throw an error if proof type is unsupported in hex generation', () => {
      expect(() =>
        createExtrinsicHex(mockApi, ProofType.fflonk, proofParams),
      ).toThrow('Unsupported proof type: fflonk');
    });

    it('should throw a formatted error if hex generation fails', () => {
      mockTxMethod.submitProof.mockImplementationOnce(() => {
        throw new Error('Hex generation error');
      });

      expect(() =>
        createExtrinsicHex(mockApi, ProofType.groth16, proofParams),
      ).toThrow(
        'Error creating submittable extrinsic: groth16 Params: {\n  "formattedVk": "vk_data",\n  "formattedProof": "proof_data",\n  "formattedPubs": "pub_data"\n} Hex generation error',
      );
    });
  });

  describe('createExtrinsicFromHex', () => {
    it('should recreate an extrinsic from a hex string', () => {
      const hexString = '0x1234';
      const mockExtrinsic = {} as SubmittableExtrinsic<'promise'>;

      (mockApi.createType as jest.Mock).mockReturnValue(mockExtrinsic);
      const recreatedExtrinsic = createExtrinsicFromHex(mockApi, hexString);

      expect(mockApi.createType).toHaveBeenCalledWith(
        'Extrinsic',
        hexToU8a(hexString),
      );
      expect(recreatedExtrinsic).toBe(mockExtrinsic);
    });

    it('should throw a formatted error if reconstruction from hex fails', () => {
      (mockApi.createType as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Reconstruction error');
      });

      expect(() => createExtrinsicFromHex(mockApi, '0x1234')).toThrow(
        'Failed to reconstruct extrinsic from hex: Reconstruction error',
      );
    });

    it('should handle non-Error types gracefully in createExtrinsicFromHex', () => {
      (mockApi.createType as jest.Mock).mockImplementationOnce(() => {
        throw 'Unknown reconstruction error';
      });

      expect(() => createExtrinsicFromHex(mockApi, '0x1234')).toThrow(
        'Failed to reconstruct extrinsic from hex: Unknown error',
      );
    });
  });
});

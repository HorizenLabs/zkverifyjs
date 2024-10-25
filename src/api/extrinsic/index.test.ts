import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { hexToU8a } from '@polkadot/util';
import {
    createSubmittableExtrinsic,
    createExtrinsicHex,
    createExtrinsicFromHex
} from './index';

const mockTxMethod = {
    submitProof: jest.fn().mockReturnValue({
        toHex: jest.fn().mockReturnValue('0x1234')
    })
};

const mockApi = {
    tx: {
        mockPallet: mockTxMethod
    },
    createType: jest.fn().mockReturnValue({ type: 'Extrinsic' }),
} as unknown as ApiPromise;

describe('extrinsic utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createSubmittableExtrinsic', () => {
        it('should create a submittable extrinsic with the given parameters', () => {
            const params = ['param1', 'param2'];
            const extrinsic = createSubmittableExtrinsic(mockApi, 'mockPallet', params);

            expect(mockTxMethod.submitProof).toHaveBeenCalledWith(...params);
            expect(extrinsic.toHex()).toBe('0x1234');
        });

        it('should throw a formatted error if extrinsic creation fails', () => {
            mockTxMethod.submitProof.mockImplementationOnce(() => {
                throw new Error('Submission error');
            });

            expect(() => createSubmittableExtrinsic(mockApi, 'mockPallet', ['param1'])).toThrow(
                'Error creating submittable extrinsic:\n        Pallet: mockPallet\n        Params: [\n  "param1"\n]\n        Error: Submission error'
            );
        });

        it('should handle non-Error types gracefully in formatError', () => {
            mockTxMethod.submitProof.mockImplementationOnce(() => {
                throw 'Unknown error';
            });

            expect(() => createSubmittableExtrinsic(mockApi, 'mockPallet', ['param1'])).toThrow(
                'Error creating submittable extrinsic:\n        Pallet: mockPallet\n        Params: [\n  "param1"\n]\n        Error: An unknown error occurred'
            );
        });
    });

    describe('createExtrinsicHex', () => {
        it('should return the hex representation of a submittable extrinsic', () => {
            const params = ['param1', 'param2'];
            const hex = createExtrinsicHex(mockApi, 'mockPallet', params);

            expect(mockTxMethod.submitProof).toHaveBeenCalledWith(...params);
            expect(hex).toBe('0x1234');
        });

        it('should throw a formatted error if hex generation fails', () => {
            mockTxMethod.submitProof.mockImplementationOnce(() => {
                throw new Error('Hex generation error');
            });

            expect(() => createExtrinsicHex(mockApi, 'mockPallet', ['param1'])).toThrow(
                'Error creating submittable extrinsic:\n        Pallet: mockPallet\n        Params: [\n  "param1"\n]\n        Error: Hex generation error'
            );
        });
    });

    describe('createExtrinsicFromHex', () => {
        it('should recreate an extrinsic from a hex string', () => {
            const hexString = '0x1234';
            const mockExtrinsic = {} as SubmittableExtrinsic<'promise'>;

            (mockApi.createType as jest.Mock).mockReturnValue(mockExtrinsic);
            const recreatedExtrinsic = createExtrinsicFromHex(mockApi, hexString);

            expect(mockApi.createType).toHaveBeenCalledWith('Extrinsic', hexToU8a(hexString));
            expect(recreatedExtrinsic).toBe(mockExtrinsic);
        });

        it('should throw a formatted error if reconstruction from hex fails', () => {
            (mockApi.createType as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Reconstruction error');
            });

            expect(() => createExtrinsicFromHex(mockApi, '0x1234')).toThrow(
                'Failed to reconstruct extrinsic from hex: Reconstruction error'
            );
        });

        it('should handle non-Error types gracefully in createExtrinsicFromHex', () => {
            (mockApi.createType as jest.Mock).mockImplementationOnce(() => {
                throw 'Unknown reconstruction error';
            });

            expect(() => createExtrinsicFromHex(mockApi, '0x1234')).toThrow(
                'Failed to reconstruct extrinsic from hex: Unknown error'
            );
        });
    });
});

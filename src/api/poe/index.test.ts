import { ApiPromise } from '@polkadot/api';
import { getProofDetails } from './index';
import { MerkleProof } from '../../types';
import { TypeRegistry, createTypeUnsafe } from '@polkadot/types';
import { H256 } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types';

const registry = new TypeRegistry();

const attestationId = 123;
const leafDigest = '0xleafdigest123456';
const blockHash = '0xblockhash123456';

const mockRoot = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const mockProof = [
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
];
const mockLeaf = '0x85bb9bbddf1eae951835add9e138087dcea9fc6bf156b065b3232edeb3394d5e';
const mockNumberOfLeaves = 10;
const mockLeafIndex = 3;

const createH256 = (value: string) => createTypeUnsafe(registry, 'H256', [value]) as H256;
const createU32 = (value: number) => createTypeUnsafe(registry, 'u32', [value]);

const mockProofPath = {
    root: createH256(mockRoot),
    proof: mockProof.map(createH256) as Vec<H256>,
    number_of_leaves: createU32(mockNumberOfLeaves),
    leaf_index: createU32(mockLeafIndex),
    leaf: createH256(mockLeaf),
};

describe('getProofDetails', () => {
    let api: ApiPromise;

    beforeEach(() => {
        api = {
            rpc: {
                poe: {
                    proofPath: jest.fn().mockResolvedValue(mockProofPath),
                },
            },
        } as unknown as ApiPromise;
    });

    it('should return proof details when blockHash is not provided', async () => {
        const expectedResult: MerkleProof = {
            root: mockRoot,
            proof: mockProof,
            numberOfLeaves: mockNumberOfLeaves,
            leafIndex: mockLeafIndex,
            leaf: mockLeaf,
        };

        const result = await getProofDetails(api, attestationId, leafDigest);
        // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
        expect(api.rpc.poe.proofPath).toHaveBeenCalledWith(attestationId, leafDigest);
        expect(result).toEqual(expectedResult);
    });

    it('should return proof details when blockHash is provided', async () => {
        const expectedResult: MerkleProof = {
            root: mockRoot,
            proof: mockProof,
            numberOfLeaves: mockNumberOfLeaves,
            leafIndex: mockLeafIndex,
            leaf: mockLeaf,
        };

        const result = await getProofDetails(api, attestationId, leafDigest, blockHash);
        // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
        expect(api.rpc.poe.proofPath).toHaveBeenCalledWith(attestationId, leafDigest, blockHash);
        expect(result).toEqual(expectedResult);
    });

    it('should throw an error if the API call fails', async () => {
        // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
        (api.rpc.poe.proofPath as jest.Mock).mockRejectedValue(new Error('API call failed'));

        await expect(getProofDetails(api, attestationId, leafDigest)).rejects.toThrow(
            'Failed to retrieve proof details: API call failed'
        );
    });

    it('should throw an error if the blockHash is invalid', async () => {
        // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
        (api.rpc.poe.proofPath as jest.Mock).mockRejectedValue(new Error('Invalid blockHash'));

        await expect(getProofDetails(api, attestationId, leafDigest, 'invalidBlockHash')).rejects.toThrow(
            'Failed to retrieve proof details: Invalid blockHash'
        );
    });
});

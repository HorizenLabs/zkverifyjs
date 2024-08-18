import { ApiPromise } from '@polkadot/api';
import { MerkleProof } from "../../types";

/**
 * Retrieves proof details for the given attestationId and leafDigest.
 *
 * @param {ApiPromise} api - The Polkadot.js API instance.
 * @param {number} attestationId - The attestation ID for which the proof path is to be retrieved.
 * @param {string} leafDigest - The leaf digest to be used in the proof path retrieval.
 * @param {string} [blockHash] - Optional block hash to retrieve the proof at a specific block.
 * @returns {Promise<MerkleProof>} An object containing the proof path details.
 */
export async function getProofDetails(
    api: ApiPromise,
    attestationId: number,
    leafDigest: string,
    blockHash?: string
): Promise<MerkleProof> {
    try {
        let proofPath;

        if (blockHash) {
            // @ts-ignore
            proofPath = await api.rpc.poe.proofPath(attestationId, leafDigest, blockHash);
        } else {
            // @ts-ignore
            proofPath = await api.rpc.poe.proofPath(attestationId, leafDigest);
        }

        return {
            root: proofPath.root.toString(),
            proof: proofPath.proof.map((h: any) => h.toString()),
            numberOfLeaves: parseInt(proofPath.number_of_leaves, 10),
            leafIndex: parseInt(proofPath.leaf_index, 10),
            leaf: proofPath.leaf.toString()
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to retrieve proof details: ${error.message}`);
        } else {
            throw new Error('Failed to retrieve proof details: An unknown error occurred.');
        }
    }
}

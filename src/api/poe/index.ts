import { ApiPromise } from '@polkadot/api';
import { MerkleProof } from '../../types';
import { Vec, u32 } from '@polkadot/types';
import { H256 } from '@polkadot/types/interfaces';

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
  blockHash?: string,
): Promise<MerkleProof> {
  try {
    let proofPath: {
      root: H256;
      proof: Vec<H256>;
      number_of_leaves: u32;
      leaf_index: u32;
      leaf: H256;
    };

    if (blockHash) {
      // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
      proofPath = await api.rpc.poe.proofPath(
        attestationId,
        leafDigest,
        blockHash,
      );
    } else {
      // @ts-expect-error: Custom RPC method 'poe.proofPath' is not recognized by TypeScript's type system
      proofPath = await api.rpc.poe.proofPath(attestationId, leafDigest);
    }

    return {
      root: proofPath.root.toString(),
      proof: proofPath.proof.map((h: H256) => h.toString()),
      numberOfLeaves: Number(proofPath.number_of_leaves),
      leafIndex: Number(proofPath.leaf_index),
      leaf: proofPath.leaf.toString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve proof details: ${error.message}`);
    } else {
      throw new Error(
        'Failed to retrieve proof details: An unknown error occurred.',
      );
    }
  }
}

import { ApiPromise } from '@polkadot/api';
import { keccak256 } from 'js-sha3';
import '@polkadot/api-augment';

/**
 * Retrieves proof details for the given attestationId and leafDigest.
 *
 * @param {ApiPromise} api - The Polkadot.js API instance.
 * @param {number} attestationId - The attestation ID for which the proof path is to be retrieved.
 * @param {string} leafDigest - The leaf digest to be used in the proof path retrieval.
 * @param {string} attestation - The root of the Merkle tree of the attestation (from AttestationEvent).
 * @returns {Promise<{ proofPath: any, attestation: string, leafIndex: number, numberOfLeaves: number, leaf: string }>}
 * An object containing the proof path details.
 */
export async function getProofDetails(
    api: ApiPromise,
    attestationId: number,
    leafDigest: string,
    attestation: string
): Promise<{
    proofPath: any,
    attestation: string,
    leafIndex: number,
    numberOfLeaves: number,
    leaf: string
}> {
    try {
        console.log("Getting proof details");
        //TODO: It can't find the poe pallet for some reason. This doesn't work.
        // @ts-ignore
        const proofPath = await api.rpc.poe.proofPath(attestationId, leafDigest);

        console.log("path: " + proofPath);
        const isValid = convertProofData(proofPath, attestation);

        if (isValid) {
            return {
                proofPath,
                attestation,
                leafIndex: parseInt(proofPath.leaf_index, 10),
                numberOfLeaves: parseInt(proofPath.number_of_leaves, 10),
                leaf: proofPath.leaf.toString('hex')
            };
        } else {
            throw new Error('Proof validation failed.');
        }
    } catch (error) {
    if (error instanceof Error) {
        throw new Error(`Failed to retrieve proof details: ${error.message}`);
    } else {
        throw new Error('Failed to retrieve proof details: An unknown error occurred.');
    }
}
}

function convertProofData(proof: any, publishedRoot: string): boolean {
    let position = parseInt(proof['leaf_index'], 10);
    let width = parseInt(proof['number_of_leaves'], 10);
    let hash = keccak256(proof['leaf'].toString('hex'));

    proof['proof'].forEach(function (p: string) {
        p = stripHexPrefix(p);
        if (position % 2 == 1 || position + 1 == width) {
            hash = keccak256('0x' + p + hash);
        } else {
            hash = keccak256('0x' + hash + p);
        }
        position = Math.floor(position / 2);
        width = Math.floor((width - 1) / 2) + 1;
    });

    return stripHexPrefix(publishedRoot) === hash;
}

function stripHexPrefix(input_str: string): string {
    return input_str.toString().replace(/^0x/, '');
}

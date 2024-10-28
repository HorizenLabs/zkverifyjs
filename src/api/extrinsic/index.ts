import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { hexToU8a } from '@polkadot/util';

/**
 * Creates a SubmittableExtrinsic using formatted proof details to enable submitting a proof.
 *
 * @param {ApiPromise} api - The Polkadot API instance.
 * @param {string} pallet - The name of the pallet containing the proof submission method.
 * @param {unknown[]} params - Formatted Proof Parameters required by the extrinsic.
 * @returns {SubmittableExtrinsic<'promise'>} The generated SubmittableExtrinsic for submission.
 * @throws {Error} - Throws an error if the extrinsic creation fails.
 */
export const createSubmittableExtrinsic = (
  api: ApiPromise,
  pallet: string,
  params: unknown[],
): SubmittableExtrinsic<'promise'> => {
  try {
    return api.tx[pallet].submitProof(...params);
  } catch (error: unknown) {
    throw new Error(formatError(error, pallet, params));
  }
};

/**
 * Generates the hex representation of a SubmittableExtrinsic using formatted proof details.
 *
 * @param {ApiPromise} api - The Polkadot API instance.
 * @param {string} pallet - The name of the pallet containing the proof submission method.
 * @param {unknown[]} params - Formatted Proof Parameters required by the extrinsic.
 * @returns {string} Hex-encoded string of the SubmittableExtrinsic.
 * @throws {Error} - Throws an error if the extrinsic creation fails.
 */
export const createExtrinsicHex = (
  api: ApiPromise,
  pallet: string,
  params: unknown[],
): string => {
  const extrinsic = createSubmittableExtrinsic(api, pallet, params);
  return extrinsic.toHex();
};

/**
 * Recreates an extrinsic from its hex-encoded representation.
 *
 * @param {ApiPromise} api - The Polkadot API instance.
 * @param {string} extrinsicHex - Hex-encoded string of the SubmittableExtrinsic.
 * @returns {SubmittableExtrinsic<'promise'>} The reconstructed SubmittableExtrinsic.
 * @throws {Error} - Throws an error if the reconstruction from hex fails.
 */
export const createExtrinsicFromHex = (
  api: ApiPromise,
  extrinsicHex: string,
): SubmittableExtrinsic<'promise'> => {
  try {
    return api.createType(
      'Extrinsic',
      hexToU8a(extrinsicHex),
    ) as SubmittableExtrinsic<'promise'>;
  } catch (error) {
    throw new Error(
      `Failed to reconstruct extrinsic from hex: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Formats a detailed error message for extrinsic creation errors.
 *
 * @param {unknown} error - The original error object encountered.
 * @param {string} pallet - The name of the pallet where the error occurred.
 * @param {unknown[]} params - Parameters used when creating the extrinsic.
 * @returns {string} A formatted error message string with details.
 */
const formatError = (
  error: unknown,
  pallet: string,
  params: unknown[],
): string => {
  const errorMessage =
    error instanceof Error ? error.message : 'An unknown error occurred';
  return `
        Error creating submittable extrinsic:
        Pallet: ${pallet}
        Params: ${JSON.stringify(params, null, 2)}
        Error: ${errorMessage}
    `;
};

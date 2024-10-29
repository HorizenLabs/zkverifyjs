import {
  Groth16VerificationKey,
  Groth16VerificationKeyInput,
  ProofInput,
} from '../types';
import { Proof } from '../types';

/**
 * Recursively converts numeric strings and hexadecimal strings in an object, array, or string
 * to `bigint`. Handles nested arrays and objects.
 *
 * @param {unknown} o - The input, which can be a string, array, or object containing numeric or
 *                      hexadecimal string values.
 * @returns {unknown} - The transformed input where all numeric and hexadecimal strings are
 *                      converted to `bigint`. Other values remain unchanged.
 *
 * The function performs the following transformations:
 * - If the input is a string containing only digits or a hexadecimal string (starting with `0x`),
 *   it converts the string to a `bigint`.
 * - If the input is an array, it recursively applies the same logic to each element.
 * - If the input is an object, it recursively applies the transformation to each property value.
 * - If the input is none of the above, it returns the input unchanged.
 */
const unstringifyBigInts = (o: unknown): unknown => {
  if (typeof o === 'string' && /^[0-9]+$/.test(o)) return BigInt(o);
  if (typeof o === 'string' && /^0x[0-9a-fA-F]+$/.test(o)) return BigInt(o);
  if (Array.isArray(o)) return o.map(unstringifyBigInts);
  if (typeof o === 'object' && o !== null) {
    const result: Record<string, unknown> = {};
    for (const key in o) {
      if (Object.prototype.hasOwnProperty.call(o, key)) {
        result[key] = unstringifyBigInts((o as Record<string, unknown>)[key]);
      }
    }
    return result;
  }
  return o;
};

/**
 * Formats zk-SNARK proof data for Groth16.
 *
 * @param {ProofInput} proof - Raw proof data.
 * @returns {Proof<ProofInner>} - Formatted proof data.
 */
export const formatProof = (proof: ProofInput): Proof => {
  const proofData = unstringifyBigInts(proof) as ProofInput;
  const curve = extractCurve(proofData);
  const endianess = getEndianess(curve);

  return {
    curve,
    proof: {
      a: formatG1Point(proofData.pi_a, endianess),
      b: formatG2Point(proofData.pi_b, endianess, curve),
      c: formatG1Point(proofData.pi_c, endianess),
    },
  };
};

/**
 * Formats verification key for Groth16 zk-SNARK proof.
 *
 * @param {Groth16VerificationKeyInput} vk - Raw verification key data.
 * @returns {Groth16VerificationKey} - Formatted verification key.
 */
export const formatVk = (
  vk: Groth16VerificationKeyInput,
): Groth16VerificationKey => {
  const vkData = unstringifyBigInts(vk) as Groth16VerificationKeyInput;
  const curve = extractCurve(vkData);
  const endianess = getEndianess(curve);

  return {
    curve,
    alpha_g1: formatG1Point(vkData.vk_alpha_1, endianess),
    beta_g2: formatG2Point(vkData.vk_beta_2, endianess, curve),
    gamma_g2: formatG2Point(vkData.vk_gamma_2, endianess, curve),
    delta_g2: formatG2Point(vkData.vk_delta_2, endianess, curve),
    gamma_abc_g1: vkData.IC.map((x: string[]) => formatG1Point(x, endianess)),
  };
};

/**
 * Formats an array of public signals.
 *
 * @param {string[]} pubs - Array of public signals.
 * @returns {string[]} - Formatted public signals.
 */
export const formatPubs = (pubs: string[]): string[] => {
  if (!Array.isArray(pubs) || pubs.some(() => false)) {
    throw new Error(
      'Invalid public signals format: Expected an array of strings.',
    );
  }
  return pubs.map(formatScalar);
};

/**
 * Extracts and normalizes curve type.
 *
 * @param {ProofInput | Groth16VerificationKeyInput} input - Input containing curve field.
 * @returns {string} - Normalized curve type ('Bn254' or 'bls12381').
 */
const extractCurve = (input: { curve: string }): string => {
  const curve = input.curve.toLowerCase();
  if (curve === 'bn128' || curve === 'bn254') return 'bn254';
  if (curve === 'bls12381' || curve === 'bls12_381') return 'Bls12_381';
  throw new Error(`Unsupported curve: ${curve}`);
};

/**
 * Determines endianess based on the curve type.
 *
 * @param {string} curve - Curve type ('Bn254' or 'Bls12381').
 * @returns {'LE' | 'BE'} - Endianess ('LE' or 'BE').
 */
const getEndianess = (curve: string): 'LE' | 'BE' => {
  return curve.toLowerCase() === 'bn254' ? 'LE' : 'BE';
};

/**
 * Converts bigint to a little-endian hexadecimal string.
 *
 * @param {bigint} value - Bigint value.
 * @param {number} length - Length of resulting hex string in bytes.
 * @returns {string} - Little-endian hexadecimal representation.
 */
export const toLittleEndianHex = (value: bigint, length: number): string => {
  return (
    '0x' +
    value
      .toString(16)
      .padStart(length * 2, '0')
      .match(/.{1,2}/g)!
      .reverse()
      .join('')
  );
};

/**
 * Converts bigint to a big-endian hexadecimal string.
 *
 * @param {bigint} value - Bigint value.
 * @param {number} length - Length of resulting hex string in bytes.
 * @returns {string} - Big-endian hexadecimal representation.
 */
const toBigEndianHex = (value: bigint, length: number): string => {
  return '0x' + value.toString(16).padStart(length * 2, '0');
};

/**
 * Formats G1 point based on endianess.
 *
 * @param {string[]} point - Coordinates of the G1 point.
 * @param {'LE' | 'BE'} endianess - Endianess of the curve.
 * @returns {string} - Formatted G1 point as hex string.
 */
const formatG1Point = (point: string[], endianess: 'LE' | 'BE'): string => {
  const [x, y] = [BigInt(point[0]), BigInt(point[1])];
  const length = endianess === 'BE' ? 48 : 32;
  return endianess === 'LE'
    ? toLittleEndianHex(x, length) + toLittleEndianHex(y, length).slice(2)
    : toBigEndianHex(x, length) + toBigEndianHex(y, length).slice(2);
};

/**
 * Formats G2 point based on endianess and curve type.
 *
 * @param {string[][]} point - Coordinates of the G2 point.
 * @param {'LE' | 'BE'} endianess - Endianess of the curve.
 * @param {string} curve - Curve type.
 * @returns {string} - Formatted G2 point as hex string.
 */
const formatG2Point = (
  point: string[][],
  endianess: 'LE' | 'BE',
  curve: string,
): string => {
  const [x1, x2, y1, y2] = [
    BigInt(point[0][0]),
    BigInt(point[0][1]),
    BigInt(point[1][0]),
    BigInt(point[1][1]),
  ];
  const length = endianess === 'BE' ? 48 : 32;
  const formattedX =
    curve === 'Bls12_381'
      ? endianess === 'LE'
        ? toLittleEndianHex(x2, length) + toLittleEndianHex(x1, length).slice(2)
        : toBigEndianHex(x2, length) + toBigEndianHex(x1, length).slice(2)
      : endianess === 'LE'
        ? toLittleEndianHex(x1, length) + toLittleEndianHex(x2, length).slice(2)
        : toBigEndianHex(x1, length) + toBigEndianHex(x2, length).slice(2);
  const formattedY =
    curve === 'Bls12_381'
      ? endianess === 'LE'
        ? toLittleEndianHex(y2, length) + toLittleEndianHex(y1, length).slice(2)
        : toBigEndianHex(y2, length) + toBigEndianHex(y1, length).slice(2)
      : endianess === 'LE'
        ? toLittleEndianHex(y1, length) + toLittleEndianHex(y2, length).slice(2)
        : toBigEndianHex(y1, length) + toBigEndianHex(y2, length).slice(2);

  return formattedX + formattedY.slice(2);
};

/**
 * Formats a scalar value as little-endian hexadecimal string.
 *
 * @param {string} scalar - Scalar value to format.
 * @returns {string} - Formatted scalar as little-endian hex.
 */
const formatScalar = (scalar: string): string =>
  toLittleEndianHex(BigInt(scalar), 32);

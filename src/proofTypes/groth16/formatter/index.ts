import { Groth16VerificationKey } from "../types";
import {Proof, ProofInner} from "../../types";

/**
 * Formats the zk-SNARK proof data for Groth16.
 *
 * @param {any} proof - The raw proof data. The expected structure is:
 *   {
 *     pi_a: [string, string],
 *     pi_b: [[string, string], [string, string]],
 *     pi_c: [string, string]
 *   }
 * @returns {Proof<ProofInner>} - The formatted proof data including the curve information.
 *   The returned object will be of the structure:
 *   {
 *     curve: "Bn254",
 *     proof: {
 *       a: { x: string, y: string },
 *       b: { x: [string, string], y: [string, string] },
 *       c: { x: string, y: string }
 *     }
 *   }
 */
export const formatProof = (proof: any): Proof<ProofInner> => {
    const formattedProof: ProofInner = {
        a: formatG1Point(proof.pi_a),
        b: formatG2Point(proof.pi_b),
        c: formatG1Point(proof.pi_c),
    };

    return {
        curve: "Bn254",
        proof: formattedProof,
    };
};

/**
 * Formats the verification key for use in the zk-SNARK proof for Groth16.
 *
 * @param {any} vkJson - The raw verification key data.
 * @returns {Groth16VerificationKey} - The formatted verification key.
 */
export const formatVk = (vkJson: any): Groth16VerificationKey => {
    return {
        curve: "Bn254",
        alpha_g1: formatG1Point(vkJson.vk_alpha_1),
        beta_g2: formatG2Point(vkJson.vk_beta_2),
        gamma_g2: formatG2Point(vkJson.vk_gamma_2),
        delta_g2: formatG2Point(vkJson.vk_delta_2),
        gamma_abc_g1: vkJson.IC.map((x: any) => formatG1Point(x)),
    };
};

/**
 * Formats an array of public signals by applying the formatScalar function to each element.
 *
 * @param {string[]} pubs - The array of public signals to format.
 * @returns {string[]} - The formatted array of public signals.
 */
export const formatPubs = (pubs: string[]): string[] => {
    return pubs.map(formatScalar);
}

/**
 * Converts a bigint value to a little-endian hexadecimal string.
 *
 * @param {bigint} value - The bigint value to convert.
 * @param {number} length - The length of the resulting hexadecimal string in bytes.
 * @returns {string} - The little-endian hexadecimal representation of the value.
 */
export const toLittleEndianHex = (value: bigint, length: number): string => {
    const hex = value.toString(16).padStart(length * 2, '0');
    const bytes = hex.match(/.{1,2}/g)!.reverse().join('');
    return `0x${bytes}`;
};

/**
 * Formats a G1 point for use in the zk-SNARK proof.
 *
 * @param {string[]} point - An array containing the x and y coordinates of the G1 point.
 * @returns {string} - The formatted G1 point as a hexadecimal string.
 */
export const formatG1Point = (point: string[]): string => {
    const x = toLittleEndianHex(BigInt(point[0]), 32);
    const y = toLittleEndianHex(BigInt(point[1]), 32);
    return x + y.slice(2);
};

/**
 * Formats a G2 point for use in the zk-SNARK proof.
 *
 * @param {string[][]} point - A 2D array containing the x and y coordinates of the G2 point.
 * @returns {string} - The formatted G2 point as a hexadecimal string.
 */
export const formatG2Point = (point: string[][]): string => {
    const x1 = toLittleEndianHex(BigInt(point[0][0]), 32);
    const x2 = toLittleEndianHex(BigInt(point[0][1]), 32);
    const y1 = toLittleEndianHex(BigInt(point[1][0]), 32);
    const y2 = toLittleEndianHex(BigInt(point[1][1]), 32);
    return x1 + x2.slice(2) + y1.slice(2) + y2.slice(2);
};

/**
 * Formats a scalar value for use in the zk-SNARK proof.
 *
 * @param {string} scalar - The scalar value to format.
 * @returns {string} - The formatted scalar as a little-endian hexadecimal string.
 */
export const formatScalar = (scalar: string): string => {
    return toLittleEndianHex(BigInt(scalar), 32);
};


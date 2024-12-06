import {
  Groth16VerificationKey,
  Groth16VerificationKeyInput,
  Proof,
  ProofInput,
} from '../../types';
import { ProofOptions } from '../../../../session/types';
import {
  extractCurve,
  formatG1Point,
  formatG2Point,
  formatPublicSignals,
  getEndianess,
  unstringifyBigInts,
} from '../utils';

/**
 * Formats zk-SNARK proof data for Groth16 using Gnark.
 *
 * @param {ProofInput} proof - Raw proof data.
 * @param {ProofOptions} options - Proof options containing curve information.
 * @returns {Proof} - Formatted proof data.
 */
export const formatProof = (
  proof: ProofInput,
  options: ProofOptions,
): Proof => {
  try {
    if (typeof proof !== 'object' || proof === null) {
      throw new Error('Invalid proof format: Expected an object.');
    }

    const proofData = unstringifyBigInts(proof) as {
      Ar: { X: string; Y: string };
      Bs: {
        X: { A0: string; A1: string };
        Y: { A0: string; A1: string };
      };
      Krs: { X: string; Y: string };
    };

    const curve = extractCurve(options.curve!);
    const endianess = getEndianess(curve);

    return {
      curve,
      proof: {
        a: formatG1Point([proofData.Ar.X, proofData.Ar.Y], endianess),
        b: formatG2Point(
          [
            [proofData.Bs.X.A0, proofData.Bs.X.A1],
            [proofData.Bs.Y.A0, proofData.Bs.Y.A1],
          ],
          endianess,
          curve,
        ),
        c: formatG1Point([proofData.Krs.X, proofData.Krs.Y], endianess),
      },
    };
  } catch (error) {
    const proofSnippet = JSON.stringify(proof).slice(0, 50);
    throw new Error(
      `Failed to format ${options.proofType} proof: ${
        error instanceof Error ? error.message : 'Unknown error'
      }. Proof snippet: "${proofSnippet}..."`,
    );
  }
};

/**
 * Formats verification key for Groth16 zk-SNARK proof using Gnark.
 *
 * @param {Groth16VerificationKeyInput} vk - Raw verification key data.
 * @param {ProofOptions} options - Proof options containing curve information.
 * @returns {Groth16VerificationKey} - Formatted verification key.
 */
export const formatVk = (
  vk: Groth16VerificationKeyInput,
  options: ProofOptions,
): Groth16VerificationKey => {
  try {
    if (typeof vk !== 'object' || vk === null) {
      throw new Error('Invalid verification key format: Expected an object.');
    }

    const vkData = unstringifyBigInts(vk) as {
      G1: { Alpha: { X: string; Y: string }; K: { X: string; Y: string }[] };
      G2: {
        Beta: { X: { A0: string; A1: string }; Y: { A0: string; A1: string } };
        Gamma: { X: { A0: string; A1: string }; Y: { A0: string; A1: string } };
        Delta: { X: { A0: string; A1: string }; Y: { A0: string; A1: string } };
      };
    };

    const curve = extractCurve(options.curve!);
    const endianess = getEndianess(curve);

    return {
      curve,
      alpha_g1: formatG1Point(
        [vkData.G1.Alpha.X, vkData.G1.Alpha.Y],
        endianess,
      ),
      beta_g2: formatG2Point(
        [
          [vkData.G2.Beta.X.A0, vkData.G2.Beta.X.A1],
          [vkData.G2.Beta.Y.A0, vkData.G2.Beta.Y.A1],
        ],
        endianess,
        curve,
      ),
      gamma_g2: formatG2Point(
        [
          [vkData.G2.Gamma.X.A0, vkData.G2.Gamma.X.A1],
          [vkData.G2.Gamma.Y.A0, vkData.G2.Gamma.Y.A1],
        ],
        endianess,
        curve,
      ),
      delta_g2: formatG2Point(
        [
          [vkData.G2.Delta.X.A0, vkData.G2.Delta.X.A1],
          [vkData.G2.Delta.Y.A0, vkData.G2.Delta.Y.A1],
        ],
        endianess,
        curve,
      ),
      gamma_abc_g1: vkData.G1.K.map((point) =>
        formatG1Point([point.X, point.Y], endianess),
      ),
    };
  } catch (error) {
    const vkSnippet = JSON.stringify(vk).slice(0, 50);
    throw new Error(
      `Failed to format ${options.proofType} verification key: ${
        error instanceof Error ? error.message : 'Unknown error'
      }. VK snippet: "${vkSnippet}..."`,
    );
  }
};

/**
 * Formats an array of public signals.
 *
 * @param {string[]} pubs - Array of public signals.
 * @returns {string[]} - Formatted public signals.
 */
export const formatPubs = (pubs: string[]): string[] => {
  return formatPublicSignals(pubs);
};

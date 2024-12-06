import {
  Groth16VerificationKey,
  Groth16VerificationKeyInput,
  Proof,
  ProofInput,
} from '../../types';
import { ProofOptions } from "../../../../session/types";
import {
  extractCurve,
  formatG1Point,
  formatG2Point,
  formatPublicSignals,
  formatScalar,
  getEndianess,
  unstringifyBigInts
} from "../utils";

/**
 * Formats zk-SNARK proof data for Groth16.
 *
 * @param {ProofInput} proof - Raw proof data.
 * @param {ProofOptions} options - Proof options containing curve information.
 * @returns {Proof} - Formatted proof data.
 */
export const formatProof = (
    proof: ProofInput,
    options: ProofOptions,
): Proof => {
  const proofData = unstringifyBigInts(proof) as ProofInput;
  const curve = extractCurve(options.curve!);
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
 * @param {ProofOptions} options - Proof options containing curve information.
 * @returns {Groth16VerificationKey} - Formatted verification key.
 */
export const formatVk = (
    vk: Groth16VerificationKeyInput,
    options: ProofOptions,
): Groth16VerificationKey => {
  const vkData = unstringifyBigInts(vk) as Groth16VerificationKeyInput;
  const curve = extractCurve(options.curve!);
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
  return formatPublicSignals(pubs);
};

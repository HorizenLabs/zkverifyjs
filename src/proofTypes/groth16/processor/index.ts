import {
  Groth16VerificationKey,
  Groth16VerificationKeyInput,
  Proof,
  ProofInput,
} from '../types';
import * as formatter from '../formatter';
import { ProofProcessor } from '../../../types';

class Groth16Processor implements ProofProcessor {
  /**
   * Formats the zk-SNARK proof based on the curve.
   *
   * @param {ProofInput} proof - The raw proof input data.
   * @returns {Proof} - The formatted proof.
   */
  formatProof(proof: ProofInput): Proof {
    return formatter.formatProof(proof);
  }

  /**
   * Formats the zk-SNARK verification key based on the curve.
   *
   * @param {Groth16VerificationKeyInput} vk - The raw verification key input.
   * @returns {Groth16VerificationKey} - The formatted verification key.
   */
  formatVk(vk: Groth16VerificationKeyInput): Groth16VerificationKey {
    return formatter.formatVk(vk);
  }

  /**
   * Formats the public inputs based on the curve.
   *
   * @param {string[]} pubs - The array of public inputs.
   * @returns {string[]} - The formatted public inputs.
   */
  formatPubs(pubs: string[]): string[] {
    return formatter.formatPubs(pubs);
  }
}

export default new Groth16Processor();

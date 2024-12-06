import {
  Groth16VerificationKey,
  Groth16VerificationKeyInput,
  Proof,
  ProofInput,
} from '../types';
import { ProofProcessor } from '../../../types';
import { ProofOptions } from '../../../session/types';

class Groth16Processor implements ProofProcessor {
  /**
   * Dynamically selects the appropriate formatter module based on the provided library option.
   *
   * @param {ProofOptions} options - The proof options containing the library type.
   * @throws {Error} If the library is unsupported or the module cannot be loaded.
   * @returns {Object} The formatter module corresponding to the specified library.
   */
  private getFormatter(options: ProofOptions): unknown {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const formatter = require(`../formatter/${options.library}`);
      return formatter;
    } catch (error) {
      throw new Error(
        `Unsupported or missing library: ${options.library} : ${error}`,
      );
    }
  }

  /**
   * Formats the zk-SNARK proof using the appropriate formatter for the specified library.
   *
   * @param {ProofInput} proof - The raw proof input data.
   * @param {ProofOptions} options - The proof options containing the library and other details.
   * @returns {Proof} The formatted proof data.
   */
  formatProof(proof: ProofInput, options: ProofOptions): Proof {
    const formatter = this.getFormatter(options);
    return formatter.formatProof(proof, options);
  }

  /**
   * Formats the verification key using the appropriate formatter for the specified library.
   *
   * @param {Groth16VerificationKeyInput} vk - The raw verification key input data.
   * @param {ProofOptions} options - The proof options containing the library and other details.
   * @returns {Groth16VerificationKey} The formatted verification key.
   */
  formatVk(
    vk: Groth16VerificationKeyInput,
    options: ProofOptions,
  ): Groth16VerificationKey {
    const formatter = this.getFormatter(options);
    return formatter.formatVk(vk, options);
  }

  /**
   * Formats the public inputs using the appropriate formatter for the specified library.
   *
   * @param {string[]} pubs - The array of public input strings.
   * @param {ProofOptions} options - The proof options containing the library and other details.
   * @returns {string[]} The formatted public inputs.
   */
  formatPubs(pubs: string[], options: ProofOptions): string[] {
    const formatter = this.getFormatter(options);
    return formatter.formatPubs(pubs);
  }
}

export default new Groth16Processor();

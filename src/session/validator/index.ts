import { proofConfigurations } from '../../config';
import { ProofOptions } from '../types';

/**
 * Validates the library and curve type for a given proof type.
 * @throws {Error} - If the validation fails.
 * @param options
 */
export function validateProofTypeOptions(options: ProofOptions): void {
  if (!options.proofType) {
    throw new Error('Proof type is required.');
  }

  const proofConfig = proofConfigurations[options.proofType];

  if (options.library && !proofConfig.requiresLibrary) {
    throw new Error(
      `Library cannot be set for proof type '${options.proofType}'.`,
    );
  }
  if (!options.library && proofConfig.requiresLibrary) {
    throw new Error(
      `Library must be specified for proof type '${options.proofType}'.`,
    );
  }

  if (options.curve && !proofConfig.requiresCurve) {
    throw new Error(
      `Curve type cannot be set for proof type '${options.proofType}'.`,
    );
  }
  if (!options.curve && proofConfig.requiresCurve) {
    throw new Error(
      `Curve type must be specified for proof type '${options.proofType}'.`,
    );
  }
}

import { ProofOptions } from '../../types';
import { VerifyInput } from '../../../api/verify/types';
import { CurveType, Library, ProofType } from '../../../config';

export type OptimisticProofMethodMap = {
  [K in keyof typeof ProofType]: (
    library?: Library,
    curve?: CurveType,
  ) => OptimisticVerificationBuilder;
};

export class OptimisticVerificationBuilder {
  constructor(
    private readonly executeOptimisticVerify: (
      proofOptions: ProofOptions,
      input: VerifyInput,
    ) => Promise<{ success: boolean; message: string }>,
    private readonly proofOptions: ProofOptions,
  ) {}

  /**
   * Executes the optimistic verification process.
   * @param {VerifyInput} input - Input for the verification, either proofData or an extrinsic.
   * @returns {Promise<{ success: boolean; message: string }>} Resolves with an object indicating success or failure and any message.
   */
  async execute(
    input: VerifyInput,
  ): Promise<{ success: boolean; message: string }> {
    return this.executeOptimisticVerify(this.proofOptions, input);
  }
}

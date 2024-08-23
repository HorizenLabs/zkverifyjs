import { VerifyOptions } from '../../types';
import { ProofType } from '../../../enums';
import { EventEmitter } from 'events';
import { VKRegistrationTransactionInfo } from '../../../types';

export type RegisterKeyMethodMap = {
  [K in keyof typeof ProofType]: () => RegisterKeyBuilder;
};

export class RegisterKeyBuilder {
  private options: VerifyOptions;
  private nonceSet = false;

  constructor(
    private readonly executeRegisterVerificationKey: (
      options: VerifyOptions,
      verificationKey: unknown,
    ) => Promise<{
      events: EventEmitter;
      transactionResult: Promise<VKRegistrationTransactionInfo>;
    }>,
    proofType: ProofType,
  ) {
    this.options = { proofType };
  }

  nonce(nonce: number): this {
    if (this.nonceSet) {
      throw new Error('Nonce can only be set once.');
    }
    this.nonceSet = true;
    this.options.nonce = nonce;
    return this;
  }

  async execute(verificationKey: unknown): Promise<{
    events: EventEmitter;
    transactionResult: Promise<VKRegistrationTransactionInfo>;
  }> {
    return this.executeRegisterVerificationKey(this.options, verificationKey);
  }
}

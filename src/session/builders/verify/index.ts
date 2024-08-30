import { VerifyOptions } from '../../types';
import { ProofType } from '../../../config';
import { EventEmitter } from 'events';
import { VerifyTransactionInfo } from '../../../types';

export type ProofMethodMap = {
  [K in keyof typeof ProofType]: () => VerificationBuilder;
};

export class VerificationBuilder {
  private options: VerifyOptions;
  private nonceSet = false;
  private waitForPublishedAttestationSet = false;
  private registeredVkSet = false;

  constructor(
    private readonly executeVerify: (
      options: VerifyOptions,
      ...proofData: unknown[]
    ) => Promise<{
      events: EventEmitter;
      transactionResult: Promise<VerifyTransactionInfo>;
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

  waitForPublishedAttestation(): this {
    if (this.waitForPublishedAttestationSet) {
      throw new Error('waitForPublishedAttestation can only be set once.');
    }
    this.waitForPublishedAttestationSet = true;
    this.options.waitForNewAttestationEvent = true;
    return this;
  }

  withRegisteredVk(): this {
    if (this.registeredVkSet) {
      throw new Error('withRegisteredVk can only be set once.');
    }
    this.registeredVkSet = true;
    this.options.registeredVk = true;
    return this;
  }

  async execute(...proofData: unknown[]): Promise<{
    events: EventEmitter;
    transactionResult: Promise<VerifyTransactionInfo>;
  }> {
    return this.executeVerify(this.options, ...proofData);
  }
}

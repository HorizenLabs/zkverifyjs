import { WalletOptions, zkVerifySessionOptions } from '../../types';
import { zkVerifySession } from '../../index';
import { SupportedNetwork } from '../../../config';

export type SupportedNetworkMap = {
  [K in keyof typeof SupportedNetwork]: (
    customWsUrl?: string,
  ) => NetworkBuilder;
};

export class NetworkBuilder {
  private options: Partial<zkVerifySessionOptions> = {};

  constructor(
    private readonly startSession: (
      options: zkVerifySessionOptions,
    ) => Promise<zkVerifySession>,
    network: SupportedNetwork,
    customWsUrl?: string,
  ) {
    this.options.host = network;

    if (network === SupportedNetwork.Custom) {
      if (!customWsUrl) {
        throw new Error('Custom network requires a WebSocket URL.');
      }
      this.options.customWsUrl = customWsUrl;
    }
  }

  withAccount(seedPhrase: string): Promise<zkVerifySession> {
    this.options.seedPhrase = seedPhrase;
    return this.startSession(this.options as zkVerifySessionOptions);
  }

  withWallet(wallet: WalletOptions): Promise<zkVerifySession> {
    this.options.wallet = wallet;
    return this.startSession(this.options as zkVerifySessionOptions);
  }

  readOnly(): Promise<zkVerifySession> {
    return this.startSession(this.options as zkVerifySessionOptions);
  }
}

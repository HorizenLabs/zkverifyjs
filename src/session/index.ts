import { ConnectionManager } from './managers/connection';
import { VerificationManager } from './managers/verification';
import { VerificationKeyRegistrationManager } from './managers/register';
import { EventManager } from './managers/events';
import { ExtrinsicManager } from './managers/extrinsic';
import { SessionMethods, zkVerifySessionOptions } from './types';
import { SupportedNetwork } from '../config';
import { NetworkBuilder, SupportedNetworkMap } from './builders/network';
import { PoEManager } from './managers/poe';
import { FormatManager } from './managers/format';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import {
  AccountConnection,
  WalletConnection,
  EstablishedConnection,
} from '../api/connection/types';
import { bindMethods } from '../utils/helpers';

export class zkVerifySession implements SessionMethods {
  private readonly connectionManager: ConnectionManager;

  verify!: VerificationManager['verify'];
  optimisticVerify!: VerificationManager['optimisticVerify'];
  registerVerificationKey!: VerificationKeyRegistrationManager['registerVerificationKey'];
  format!: FormatManager['format'];
  poe!: PoEManager['poe'];
  subscribeToNewAttestations!: EventManager['subscribe'];
  unsubscribe!: EventManager['unsubscribe'];
  estimateCost!: ExtrinsicManager['estimateCost'];
  createSubmitProofExtrinsic!: ExtrinsicManager['createSubmitProofExtrinsic'];
  createExtrinsicHex!: ExtrinsicManager['createExtrinsicHex'];
  createExtrinsicFromHex!: ExtrinsicManager['createExtrinsicFromHex'];
  close!: ConnectionManager['close'];
  accountInfo!: ConnectionManager['getAccountInfo'];
  addAccount!: ConnectionManager['addAccount'];
  removeAccount!: ConnectionManager['removeAccount'];

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;

    const managers = [
      new VerificationManager(connectionManager),
      new VerificationKeyRegistrationManager(connectionManager),
      new EventManager(connectionManager),
      new ExtrinsicManager(connectionManager),
      new PoEManager(connectionManager),
      new FormatManager(connectionManager),
      connectionManager,
    ];

    managers.forEach((manager) => bindMethods(this, manager));
  }

  static start(): SupportedNetworkMap {
    const builderMethods: Partial<
      Record<
        keyof typeof SupportedNetwork,
        (customWsUrl?: string) => NetworkBuilder
      >
    > = {};

    for (const network in SupportedNetwork) {
      if (Object.prototype.hasOwnProperty.call(SupportedNetwork, network)) {
        builderMethods[network as keyof typeof SupportedNetwork] = (
          customWsUrl?: string,
        ) => {
          return new NetworkBuilder(
            zkVerifySession._startSession.bind(zkVerifySession),
            SupportedNetwork[network as keyof typeof SupportedNetwork],
            customWsUrl,
          );
        };
      }
    }

    return builderMethods as SupportedNetworkMap;
  }

  get api(): ApiPromise {
    return this.connectionManager.api;
  }

  get provider(): WsProvider {
    return this.connectionManager.provider;
  }

  get account(): KeyringPair | undefined {
    return this.connectionManager.account;
  }

  get connection():
    | AccountConnection
    | WalletConnection
    | EstablishedConnection {
    return this.connectionManager.connectionDetails;
  }

  private static async _startSession(
    options: zkVerifySessionOptions,
  ): Promise<zkVerifySession> {
    const connectionManager = await ConnectionManager.createSession(options);
    return new zkVerifySession(connectionManager);
  }
}

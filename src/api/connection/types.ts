import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { InjectedExtension } from '@polkadot/extension-inject/types';

export interface EstablishedConnection {
  api: ApiPromise;
  provider: WsProvider;
}

export interface AccountConnection extends EstablishedConnection {
  account: KeyringPair;
}

export interface WalletConnection extends EstablishedConnection {
  injector: InjectedExtension;
  accountAddress: string;
}

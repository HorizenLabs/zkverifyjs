import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

export interface EstablishedConnection {
  api: ApiPromise;
  provider: WsProvider;
}

export interface AccountConnection extends EstablishedConnection {
  account: KeyringPair;
}

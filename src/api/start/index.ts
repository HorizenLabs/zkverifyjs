import { establishConnection } from '../connection';
import { setupAccount } from '../account';
import { zkVerifySessionOptions } from '../../session/types';
import {
  AccountConnection,
  EstablishedConnection,
  WalletConnection,
} from '../connection/types';

export async function startSession(
  options: zkVerifySessionOptions,
): Promise<AccountConnection | EstablishedConnection> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'startSession should not be called in a browser environment, use "startWalletSession"',
    );
  }

  const { host, seedPhrase, customWsUrl } = options;
  const { api, provider } = await establishConnection(host, customWsUrl);

  if (seedPhrase) {
    const account = setupAccount(seedPhrase);
    return { api, provider, account } as AccountConnection;
  } else {
    return { api, provider } as EstablishedConnection;
  }
}

export async function startWalletSession(
  options: zkVerifySessionOptions,
): Promise<WalletConnection> {
  const { host, customWsUrl } = options;
  const { api, provider } = await establishConnection(host, customWsUrl);

  if (typeof window === 'undefined') {
    throw new Error(
      'This function must be called in a browser environment, for server side / backend use "startSession"',
    );
  }

  const { web3Enable, web3Accounts, web3FromSource } = await import(
    '@polkadot/extension-dapp'
  );

  const extensions = await web3Enable('zkVerify');
  if (extensions.length === 0) {
    throw new Error('No extension installed or access was denied.');
  }

  const accounts = await web3Accounts();
  if (accounts.length === 0) {
    throw new Error('No accounts found.');
  }

  const selectedAccount = accounts[0];
  const injector = await web3FromSource(selectedAccount.meta.source);

  return { api, provider, injector, accountAddress: selectedAccount.address };
}

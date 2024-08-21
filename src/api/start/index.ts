import { establishConnection } from '../../connection';
import { setupAccount } from '../../account';
import { zkVerifySessionOptions } from '../../session/types';
import {
  AccountConnection,
  EstablishedConnection,
} from '../../connection/types';

export async function startSession(
  options: zkVerifySessionOptions,
): Promise<AccountConnection | EstablishedConnection> {
  const { host, seedPhrase, customWsUrl } = options;

  if (host === 'custom' && !customWsUrl) {
    throw new Error(
      'Custom WebSocket URL must be provided when host is set to "custom".',
    );
  }

  const { api, provider } = await establishConnection(host, customWsUrl);

  if (seedPhrase) {
    const account = setupAccount(seedPhrase);
    return { api, provider, account } as AccountConnection;
  } else {
    return { api, provider } as EstablishedConnection;
  }
}

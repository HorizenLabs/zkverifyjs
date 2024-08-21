import { ApiPromise, WsProvider } from '@polkadot/api';
import { SupportedNetwork, defaultUrls } from '../config';
import { EstablishedConnection } from './types';
import { waitForNodeToSync } from '../utils/helpers';
import { zkvTypes, zkvRpc } from '../config';

/**
 * Establishes a connection to the zkVerify blockchain by initializing the API and provider.
 *
 * @param {SupportedNetwork} host - The network host ('testnet', 'mainnet', or 'custom').
 * @param {string} [customWsUrl] - The custom WebSocket URL (only used if host is 'custom').
 * @returns {Promise<EstablishedConnection>} The initialized API and provider.
 * @throws Will throw an error if the connection fails or if the provided configuration is invalid.
 */
export const establishConnection = async (
  host: SupportedNetwork,
  customWsUrl?: string,
): Promise<EstablishedConnection> => {
  let websocketUrl: string;

  if (host === 'custom') {
    if (!customWsUrl) {
      throw new Error(
        'Custom WebSocket URL must be provided when host is set to "custom".',
      );
    }
    websocketUrl = customWsUrl;
  } else {
    if (customWsUrl) {
      throw new Error(
        'Custom WebSocket URL provided. Please select "custom" as the host if you want to use a custom WebSocket endpoint.',
      );
    }
    if (!(host in defaultUrls)) {
      throw new Error(`Unsupported network host: ${host}`);
    }
    websocketUrl = defaultUrls[host];
  }

  try {
    const provider = new WsProvider(websocketUrl);
    const api = await ApiPromise.create({
      provider,
      types: zkvTypes,
      rpc: zkvRpc,
    });

    await waitForNodeToSync(api);

    return { api, provider };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to establish connection to ${host}: ${error.message}`,
      );
    } else {
      throw new Error(
        'Failed to establish connection due to an unknown error.',
      );
    }
  }
};

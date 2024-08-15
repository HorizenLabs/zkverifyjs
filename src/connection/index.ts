import { ApiPromise, WsProvider } from '@polkadot/api';
import { defaultUrls } from '../config';
import { waitForNodeToSync } from '../utils/helpers';

type SupportedHost = keyof typeof defaultUrls;

/**
 * Establishes a connection to the zkVerify blockchain by initializing the API and provider.
 *
 * @param {string} host - The network host ('testnet', 'mainnet', or 'custom').
 * @param {string} [customWsUrl] - The custom WebSocket URL (only used if host is 'custom').
 * @returns {Promise<{ api: ApiPromise, provider: WsProvider }>} The initialized API and provider.
 * @throws Will throw an error if the connection fails or if the provided configuration is invalid.
 */
export const establishConnection = async (host: string, customWsUrl?: string): Promise<{ api: ApiPromise, provider: WsProvider }> => {
    let websocketUrl: string;

    if (host !== 'custom' && customWsUrl) {
        throw new Error('Custom WebSocket URL provided. Please select "custom" as the host if you want to use a custom WebSocket endpoint.');
    }

    if (host === 'custom') {
        if (!customWsUrl) {
            throw new Error('Custom WebSocket URL must be provided when host is set to "custom".');
        }
        websocketUrl = customWsUrl;
    } else {
        if (!(host in defaultUrls)) {
            throw new Error(`Unsupported network host: ${host}`);
        }
        websocketUrl = defaultUrls[host as SupportedHost];
    }

    try {
        const provider = new WsProvider(websocketUrl);
        const api = await ApiPromise.create({ provider });

        await waitForNodeToSync(api);

        return { api, provider };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to establish connection to ${host}: ${error.message}`);
        } else {
            throw new Error('Failed to establish connection due to an unknown error.');
        }
    }
};

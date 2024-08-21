import { ApiPromise, WsProvider } from '@polkadot/api';

export async function closeSession(
  api: ApiPromise,
  provider: WsProvider,
): Promise<void> {
  try {
    await api.disconnect();

    let retries = 5;
    while (provider.isConnected && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries--;
    }

    if (provider.isConnected) {
      await provider.disconnect();
    }
  } catch (error) {
    throw new Error(
      `Failed to close the session: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

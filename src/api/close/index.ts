import { WsProvider } from '@polkadot/api';

export async function closeSession(provider: WsProvider): Promise<void> {
  const disconnectWithRetries = async (
    name: string,
    disconnectFn: () => Promise<void>,
    isConnectedFn: () => boolean,
  ) => {
    let retries = 5;
    while (retries > 0) {
      await disconnectFn();
      if (!isConnectedFn()) {
        return;
      }
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to disconnect ${name} after 5 attempts.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const errors: string[] = [];

  if (provider.isConnected) {
    try {
      await disconnectWithRetries(
        'Provider',
        () => provider.disconnect(),
        () => provider.isConnected,
      );
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' and '));
  }
}

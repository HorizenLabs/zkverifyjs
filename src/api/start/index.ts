import { establishConnection } from '../../connection';
import { setupAccount } from '../../account';
import { zkVerifySessionOptions } from '../../session/types';
import { zkVerifySession } from '../../session';

export async function startSession(options: zkVerifySessionOptions): Promise<zkVerifySession> {
    const { host, seedPhrase, customWsUrl } = options;

    if (host === 'custom' && !customWsUrl) {
        throw new Error('Custom WebSocket URL must be provided when host is set to "custom".');
    }

    const { api, provider } = await establishConnection(host, customWsUrl);

    let session: zkVerifySession;

    try {
        const account = seedPhrase ? setupAccount(seedPhrase) : undefined;
        session = new zkVerifySession(api, provider, account);
    } catch (error) {
        session = new zkVerifySession(api, provider, undefined);
        await session.close();
        throw new Error(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return session;
}

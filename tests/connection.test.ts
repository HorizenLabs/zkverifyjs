import { zkVerifySession } from '../src';

describe('zkVerifySession class', () => {
    it('should establish a connection and close it successfully', async () => {
        const session = await zkVerifySession.start({ host: 'testnet' });
        expect(session).toBeDefined();
        expect(session['api']).toBeDefined();
        expect(session['provider']).toBeDefined();

        await session.close();
        expect(session['api'].isConnected).toBe(false);
        expect(session['provider'].isConnected).toBe(false);
    });
});

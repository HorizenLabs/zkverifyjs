import 'dotenv/config';
import { zkVerifySession } from '../src';
import { AccountInfo } from "../src/types";

jest.setTimeout(120000);

describe('zkVerifySession - accountInfo', () => {
    it('should retrieve the account info including address, nonce, free balance and reserved balance', async () => {
        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        try {
            const accountInfo: AccountInfo = await session.accountInfo();
            expect(accountInfo).toBeDefined();

            expect(accountInfo.address).toBeDefined();
            expect(typeof accountInfo.address).toBe('string');

            expect(accountInfo.nonce).toBeDefined();
            expect(typeof accountInfo.nonce).toBe('number');
            expect(accountInfo.nonce).toBeGreaterThanOrEqual(0);

            expect(accountInfo.freeBalance).toBeDefined();
            expect(typeof accountInfo.freeBalance).toBe('string');
            expect(parseFloat(accountInfo.freeBalance)).toBeGreaterThanOrEqual(0);

            expect(accountInfo.reservedBalance).toBeDefined();
            expect(typeof accountInfo.reservedBalance).toBe('string');
            expect(parseFloat(accountInfo.reservedBalance)).toBeGreaterThanOrEqual(0);
        } catch (error) {
            console.error('Error fetching account info:', error);
            throw error;
        } finally {
            await session.close();
        }
    });

    it('should throw an error if trying to get account info in a read-only session', async () => {
        const session = await zkVerifySession.start({ host: 'testnet' });

        try {
            await expect(session.accountInfo()).rejects.toThrow('This session is read-only. A seed phrase is required on session start in order to send transactions.');
        } finally {
            await session.close();
        }
    });
});

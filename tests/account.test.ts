import 'dotenv/config';
import { zkVerifySession } from '../src';
import { AccountInfo } from "../src/types";

jest.setTimeout(120000);

describe('zkVerifySession - accountInfo', () => {
    it('should retrieve the account info including address, nonce, free balance and reserved balance', async () => {
        const session = await zkVerifySession.start().Testnet().withAccount(process.env.SEED_PHRASE!);

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
        const session = await zkVerifySession.start().Testnet().readOnly();

        try {
            await expect(session.accountInfo()).rejects.toThrow('This action requires an active account. The session is currently in read-only mode because no account is associated with it. Please provide an account at session start, or add one to the current session using `addAccount`.');
        } finally {
            await session.close();
        }
    });
});

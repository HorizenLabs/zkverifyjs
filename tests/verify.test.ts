import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';

jest.setTimeout(120000);

describe('sendProof - Fflonk', () => {
    it('should send the fflonk proof, return a valid result, and emit the expected events', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });
        const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;

        events.on('includedInBlock', (eventData) => {
            includedInBlockEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.proofLeaf).not.toBeNull();
        });

        events.on('finalized', (eventData) => {
            finalizedEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.proofLeaf).not.toBeNull();
        });

        const result = await transactionResult;
        console.log('Final transaction result:', result);
        expect(result).toBeDefined();
        expect(result.finalized).toBe(true);
        expect(result.attestationId).not.toBeNull();
        expect(result.blockHash).not.toBeNull();
        expect(result.proofLeaf).not.toBeNull();

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);

        await session.close();
    });
});

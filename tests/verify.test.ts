import fs from 'fs';
import path from 'path';
import { zkVerifySession } from '../src';

jest.setTimeout(120000);

describe('sendProof - Fflonk', () => {
    it('should send the fflonk proof, return a valid result, and emit the includedInBlock event with valid data', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;
        // TODO use env file for test transactions.
        const session = await zkVerifySession.start('testnet', "1");

        const includedInBlockEvent = new Promise<void>((resolve, reject) => {
            session.on('includedInBlock', (eventData) => {
                try {
                    expect(eventData).toBeDefined();
                    expect(eventData.blockHash).not.toBeNull();
                    expect(eventData.proofType).toBe('fflonk');
                    expect(eventData.attestationId).not.toBeNull();
                    expect(eventData.proofLeaf).not.toBeNull();
                    console.log('includedInBlock event data validated.');
                    resolve();
                } catch (error) {
                    console.error('Error validating includedInBlock event data:', error);
                    reject(error);
                }
            });
        });

        const result = await session.sendProof('fflonk', proof, publicSignals, vk);
        await includedInBlockEvent;

        expect(result).toBeDefined();
        expect(result.attestationId).not.toBeNull();
        expect(result.finalized).toBe(true);
        expect(result.blockHash).not.toBeNull();
        expect(result.proofLeaf).not.toBeNull();

        await session.close();
    });
});

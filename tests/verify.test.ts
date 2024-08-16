import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { ProofTransactionResult, zkVerifySession } from '../src';

jest.setTimeout(120000);

describe('verify - Fflonk', () => {
    it('should send the fflonk proof for verification, return a valid result, and emit the expected events', async () => {
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
            expect(eventData.status).toBe('inBlock');
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        events.on('finalized', (eventData) => {
            finalizedEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.proofLeaf).not.toBeNull();
            expect(eventData.status).toBe('finalized');
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        const result: ProofTransactionResult = await transactionResult;
        console.log('Final transaction result:', result);
        expect(result).toBeDefined();
        expect(result.finalized).toBe(true);
        expect(result.attestationConfirmed).toBeDefined();
        const { transactionInfo } = result;
        expect(transactionInfo).toBeDefined();
        expect(transactionInfo.blockHash).not.toBeNull();
        expect(transactionInfo.proofType).toBe('fflonk');
        expect(transactionInfo.attestationId).not.toBeNull();
        expect(transactionInfo.proofLeaf).not.toBeNull();
        expect(transactionInfo.status).toBe('finalized');
        expect(transactionInfo.txHash).toBeDefined();
        expect(transactionInfo.extrinsicIndex).toBeDefined();
        expect(transactionInfo.feeInfo).toBeDefined();
        expect(transactionInfo.weightInfo).toBeDefined();
        expect(transactionInfo.txClass).toBeDefined();

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);

        await session.close();
    });
});

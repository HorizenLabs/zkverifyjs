import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';
import { VKRegistrationTransactionInfo } from "../src/types";
import { ZkVerifyEvents } from "../src/enums";

jest.setTimeout(180000);

describe('registerVerificationKey - Fflonk', () => {
    it('should register the verification key and return the statement hash on finalization', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;
        let errorEventEmitted = false;

        const { events, transactionResult } = await session.registerVerificationKey(
            { proofType: 'fflonk' },
            vk
        );

        events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("includedInBlock Event Received: ", eventData);
            includedInBlockEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.status).toBe('inBlock');
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        events.on(ZkVerifyEvents.Finalized, (eventData) => {
            console.log("finalized Event Received: ", eventData);
            finalizedEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.status).toBe('finalized');
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        events.on(ZkVerifyEvents.ErrorEvent, (error) => {
            console.error("Error Event Received: ", error);
            errorEventEmitted = true;
        });

        const transactionInfo: VKRegistrationTransactionInfo = await transactionResult;

        console.log('Final transaction result:', transactionInfo);
        expect(transactionInfo).toBeDefined();
        expect(transactionInfo.blockHash).not.toBeNull();
        expect(transactionInfo.proofType).toBe('fflonk');
        expect(transactionInfo.status).toBe('finalized');
        expect(transactionInfo.txHash).toBeDefined();
        expect(transactionInfo.extrinsicIndex).toBeDefined();
        expect(transactionInfo.feeInfo).toBeDefined();
        expect(transactionInfo.weightInfo).toBeDefined();
        expect(transactionInfo.txClass).toBeDefined();
        expect(transactionInfo.statementHash).toBeDefined();

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);
        expect(errorEventEmitted).toBe(false);

        await session.close();
    });
});

import fs from 'fs';
import path from 'path';
import { zkVerifySession } from '../src';
import { VerifyTransactionInfo, VKRegistrationTransactionInfo } from "../src/types";
import { TransactionStatus, ZkVerifyEvents } from "../src/enums";

jest.setTimeout(180000);

describe('registerVerificationKey - Fflonk', () => {
    it('should register the verification key and return the statement hash on finalization', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        const session = await zkVerifySession.start().Testnet().withAccount(process.env.SEED_PHRASE!);

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;
        let errorEventEmitted = false;

        const { events, transactionResult } = await session.registerVerificationKey().fflonk().execute(vk);

        events.on(ZkVerifyEvents.ErrorEvent, (eventData) => {
            errorEventEmitted = true;
        });

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
            expect(eventData.statementHash).toBeDefined();
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
            expect(eventData.statementHash).toBeDefined();
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
        console.log("StatementHash:" + transactionInfo.statementHash);

        const {events: verifyEvents, transactionResult: verifyTransactionResult} = await session.verify()
            .fflonk()
            .withRegisteredVk()
            .execute(proof, publicSignals, transactionInfo.statementHash);

        verifyEvents.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("verify includedInBlock Event Received: ", eventData);
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.status).toBe(TransactionStatus.InBlock);
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        verifyEvents.on(ZkVerifyEvents.Finalized, (eventData) => {
            console.log("verify finalized Event Received: ", eventData);
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('fflonk');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.status).toBe(TransactionStatus.Finalized);
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        const verifyTransactionInfo: VerifyTransactionInfo = await verifyTransactionResult;

        console.log('Final transaction result:', verifyTransactionInfo);
        expect(verifyTransactionInfo).toBeDefined();
        expect(verifyTransactionInfo.blockHash).not.toBeNull();
        expect(verifyTransactionInfo.proofType).toBe('fflonk');
        expect(verifyTransactionInfo.attestationId).not.toBeNull();
        expect(verifyTransactionInfo.leafDigest).not.toBeNull();
        expect(verifyTransactionInfo.status).toBe(TransactionStatus.Finalized);
        expect(verifyTransactionInfo.txHash).toBeDefined();
        expect(verifyTransactionInfo.extrinsicIndex).toBeDefined();
        expect(verifyTransactionInfo.feeInfo).toBeDefined();
        expect(verifyTransactionInfo.weightInfo).toBeDefined();
        expect(verifyTransactionInfo.txClass).toBeDefined();
        expect(verifyTransactionInfo.attestationConfirmed).toBe(false);

        await session.close();
    });
});

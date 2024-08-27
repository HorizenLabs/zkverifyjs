import fs from 'fs';
import path from 'path';
import { zkVerifySession } from '../src';
import { VerifyTransactionInfo } from "../src/types";
import { TransactionStatus, ZkVerifyEvents } from "../src/enums";

jest.setTimeout(300000);

describe('verify and subscribe using a custom network url - Risc0', () => {
    it('should send the risc0 proof for verification and respond on finalization without waiting for the NewAttestation event', async () => {
        const dataPath = path.join(__dirname, 'data', 'risc0.json');
        const risc0Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = risc0Data;

        const session = await zkVerifySession.start().Custom("wss://testnet-rpc.zkverify.io").withAccount(process.env.SEED_PHRASE!);

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;
        let errorEventEmitted = false;

        const {events, transactionResult} = await session.verify().risc0()
            .waitForPublishedAttestation()
            .execute(
            proof,
            publicSignals,
            vk
        );

        events.on(ZkVerifyEvents.ErrorEvent, (eventData) => {
            errorEventEmitted = true;
        });

        events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("includedInBlock Event Received: ", eventData);
            includedInBlockEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('risc0');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.status).toBe(TransactionStatus.InBlock);
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
            expect(eventData.proofType).toBe('risc0');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.status).toBe(TransactionStatus.Finalized);
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        const transactionInfo: VerifyTransactionInfo = await transactionResult;

        console.log('Final transaction result:', transactionInfo);
        expect(transactionInfo).toBeDefined();
        expect(transactionInfo.blockHash).not.toBeNull();
        expect(transactionInfo.proofType).toBe('risc0');
        expect(transactionInfo.attestationId).not.toBeNull();
        expect(transactionInfo.leafDigest).not.toBeNull();
        expect(transactionInfo.status).toBe(TransactionStatus.Finalized);
        expect(transactionInfo.txHash).toBeDefined();
        expect(transactionInfo.extrinsicIndex).toBeDefined();
        expect(transactionInfo.feeInfo).toBeDefined();
        expect(transactionInfo.weightInfo).toBeDefined();
        expect(transactionInfo.txClass).toBeDefined();
        expect(transactionInfo.attestationConfirmed).toBe(true);
        expect(transactionInfo.attestationEvent).toBeDefined();

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);
        expect(errorEventEmitted).toBe(false);

        await session.close();
    });
});
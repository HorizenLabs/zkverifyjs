import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';
import { VerifyTransactionInfo } from "../src/types";
import { TransactionStatus, ZkVerifyEvents } from "../src/enums";

jest.setTimeout(180000);

describe('verify and subscribe - Groth16', () => {
    it('should send the groth16 proof for verification and respond on finalization without waiting for the NewAttestation event', async () => {
        const dataPath = path.join(__dirname, 'data', 'groth16.json');
        const groth16Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const {proof, publicSignals, vk} = groth16Data;

        const session = await zkVerifySession.start({host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;
        let attestationConfirmedEmitted = false;
        let errorEventEmitted = false;

        const {events, transactionResult} = await session.verify(
            {proofType: 'groth16', waitForNewAttestationEvent: true},
            proof,
            publicSignals,
            vk
        );

        events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("includedInBlock Event Received: ", eventData);
            includedInBlockEmitted = true;
            expect(eventData).toBeDefined();
            expect(eventData.blockHash).not.toBeNull();
            expect(eventData.proofType).toBe('groth16');
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
            expect(eventData.proofType).toBe('groth16');
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.status).toBe(TransactionStatus.Finalized);
            expect(eventData.txHash).toBeDefined();
            expect(eventData.extrinsicIndex).toBeDefined();
            expect(eventData.feeInfo).toBeDefined();
            expect(eventData.weightInfo).toBeDefined();
            expect(eventData.txClass).toBeDefined();
        });

        events.on('attestationConfirmed', (eventData) => {
            attestationConfirmedEmitted = true;
            console.log('NewAttestation Event raised:', eventData);
            expect(eventData).toBeDefined();
        });

        const transactionInfo: VerifyTransactionInfo = await transactionResult;

        console.log('Final transaction result:', transactionInfo);
        expect(transactionInfo).toBeDefined();
        expect(transactionInfo.blockHash).not.toBeNull();
        expect(transactionInfo.proofType).toBe('groth16');
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
        expect(attestationConfirmedEmitted).toBe(true);
        expect(errorEventEmitted).toBe(false);

        await session.close();
    });
});
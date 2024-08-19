import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';
import { AttestationEvent } from "../src";
import { VerifyTransactionInfo } from "../src/types";
import {TransactionStatus, ZkVerifyEvents} from "../src/enums";

jest.setTimeout(180000);

describe('verify and subscribe - Fflonk', () => {
    it('should send the fflonk proof for verification and respond on finalization without waiting for the NewAttestation event, subscribe to NewAttestation events, and receive the expected event from the subscription', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;
        let attestationConfirmedEmitted = false;
        let attestationBeforeExpectedEmitted = false;
        let attestationMissedEmitted = false;
        let errorEventEmitted = false;

        const { events, transactionResult } = await session.verify(
            { proofType: 'fflonk' },
            proof,
            publicSignals,
            vk
        );

        const newAttestationPromise = new Promise<void>((resolve, reject) => {
            const attestationEmitter = session.subscribeToNewAttestations((data: AttestationEvent) => {
                console.log('NewAttestation Event Received:', data.id, data.attestation);
                expect(data.id).toBeDefined();
                expect(data.attestation).toBeDefined();
                attestationConfirmedEmitted = true;
                resolve();
            });

            attestationEmitter
                .on(ZkVerifyEvents.AttestationBeforeExpected, (eventData) => {
                    console.log("Attestation Before Expected Event Received: ", eventData);
                    attestationBeforeExpectedEmitted = true;
                })
                .on(ZkVerifyEvents.AttestationMissed, (eventData) => {
                    console.error("Attestation Missed Event Received: ", eventData);
                    attestationMissedEmitted = true;
                    reject(new Error(`Missed attestation ID: ${eventData.expectedId}, received: ${eventData.receivedId}`));
                })
                .on(ZkVerifyEvents.ErrorEvent, (error) => {
                    console.error("Error Event Received: ", error);
                    errorEventEmitted = true;
                    reject(error);
                });
        });

        events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("includedInBlock Event Received: ", eventData);
            includedInBlockEmitted = true;
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

        events.on(ZkVerifyEvents.Finalized, (eventData) => {
            console.log("finalized Event Received: ", eventData);
            finalizedEmitted = true;
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

        const transactionInfo: VerifyTransactionInfo = await transactionResult;
        await newAttestationPromise;

        console.log('Final transaction result:', transactionInfo);
        expect(transactionInfo).toBeDefined();
        expect(transactionInfo.blockHash).not.toBeNull();
        expect(transactionInfo.proofType).toBe('fflonk');
        expect(transactionInfo.attestationId).not.toBeNull();
        expect(transactionInfo.leafDigest).not.toBeNull();
        expect(transactionInfo.status).toBe(TransactionStatus.Finalized);
        expect(transactionInfo.txHash).toBeDefined();
        expect(transactionInfo.extrinsicIndex).toBeDefined();
        expect(transactionInfo.feeInfo).toBeDefined();
        expect(transactionInfo.weightInfo).toBeDefined();
        expect(transactionInfo.txClass).toBeDefined();
        expect(transactionInfo.attestationConfirmed).toBe(false);

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);
        expect(attestationConfirmedEmitted).toBe(true);
        expect(attestationBeforeExpectedEmitted).toBe(false);
        expect(attestationMissedEmitted).toBe(false);
        expect(errorEventEmitted).toBe(false);

        await session.close();
    });
});

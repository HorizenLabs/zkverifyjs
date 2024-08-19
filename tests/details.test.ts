import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';
import { VerifyTransactionInfo } from "../src/types";

jest.setTimeout(300000);

describe('verify and getProofDetails - Fflonk', () => {
    it('should send the fflonk proof for verification, receive the NewAttestation event, and retrieve proof details', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        console.log('Starting session...');
        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        console.log('Session started. Sending proof for verification...');
        const { events, transactionResult } = await session.verify(
            { proofType: 'fflonk', waitForNewAttestationEvent: true },
            proof,
            publicSignals,
            vk);

        console.log('Proof sent. Waiting for transaction result...');

        let includedInBlockEmitted = false;
        let finalizedEmitted = false;

        events.on('includedInBlock', (eventData) => {
            includedInBlockEmitted = true;
            console.log('Transaction included in block:', eventData);
            expect(eventData).toBeDefined();
        });

        events.on('finalized', (eventData) => {
            finalizedEmitted = true;
            console.log('Transaction finalized:', eventData);
            expect(eventData).toBeDefined();
        });

        events.on('attestationConfirmed', (eventData) => {
            finalizedEmitted = true;
            console.log('NewAttestation Event raised:', eventData);
            expect(eventData).toBeDefined();
        });

        const result: VerifyTransactionInfo = await transactionResult;

        expect(includedInBlockEmitted).toBe(true);
        expect(finalizedEmitted).toBe(true);

        console.log('Transaction finalized. Retrieving proof details...');

        try {
            const proofDetails = await session.poe(
                result.attestationId!,
                result.leafDigest!
            );

            console.log('Proof details:', proofDetails);
            expect(proofDetails).toBeDefined();
            expect(proofDetails.root).toBeDefined();
            expect(proofDetails.leafIndex).toBeGreaterThanOrEqual(0);
            expect(proofDetails.numberOfLeaves).toBeGreaterThanOrEqual(0);
            expect(proofDetails.leaf).toBeDefined();
        } catch (error) {
            console.error('Failed to retrieve proof details:', error);
            throw error;
        }

        await session.close();
        console.log('Session closed.');
    });

    it('should send two fflonk proofs for verification, both receiving the same attestationId, and retrieve proof details', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        console.log('Starting session for two transactions...');
        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        console.log('Session started. Sending two proofs for verification...');

        const currentNonce = (await session.accountInfo()).nonce

        const [tx1, tx2] = await Promise.all([
            session.verify({ proofType: 'fflonk', waitForNewAttestationEvent: true, nonce: currentNonce }, proof, publicSignals, vk),
            session.verify({ proofType: 'fflonk', waitForNewAttestationEvent: true, nonce: currentNonce + 1 }, proof, publicSignals, vk)
        ]);

        const result1: VerifyTransactionInfo = await tx1.transactionResult;
        const result2: VerifyTransactionInfo = await tx2.transactionResult;

        expect(result1.attestationConfirmed).toBe(true);
        expect(result1.attestationEvent).toBeDefined();
        expect(result1.attestationId).toBe(result2.attestationId);
        console.log('Both transactions have the same attestationId:', result1.attestationId);

        try {
            const proofDetails1 = await session.poe(
                result1.attestationId!,
                result1.leafDigest!
            );
            const proofDetails2 = await session.poe(
                result2.attestationId!,
                result2.leafDigest!
            );

            console.log('Proof details for Transaction 1:', proofDetails1);
            console.log('Proof details for Transaction 2:', proofDetails2);

            expect(proofDetails1).toBeDefined();
            expect(proofDetails1.root).toBeDefined();
            expect(proofDetails1.leafIndex).toBeGreaterThanOrEqual(0);
            expect(proofDetails1.numberOfLeaves).toBeGreaterThanOrEqual(0);
            expect(proofDetails1.leaf).toBeDefined();

            expect(proofDetails2).toBeDefined();
            expect(proofDetails2.root).toBeDefined();
            expect(proofDetails2.leafIndex).toBeGreaterThanOrEqual(0);
            expect(proofDetails2.numberOfLeaves).toBeGreaterThanOrEqual(0);
            expect(proofDetails2.leaf).toBeDefined();
        } catch (error) {
            console.error('Failed to retrieve proof details for the transactions:', error);
            throw error;
        }

        await session.close();
        console.log('Session closed for two transactions.');
    });
});

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession } from '../src';
import { ZkVerifyEvents } from "../src/enums";

jest.setTimeout(180000);

describe('verify with bad data - Groth16', () => {
    it('should fail when sending groth16 data that cannot be formatted and emit an error event', async () => {
        const dataPath = path.join(__dirname, 'data', 'groth16_error.json');
        const groth16Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const badProof = { ...groth16Data.proof, pi_a: 'bad_data' };
        const { publicSignals, vk } = groth16Data;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        let errorEventEmitted = false;

        const { events, transactionResult } = await session.verify(
            { proofType: 'groth16', waitForNewAttestationEvent: true },
            badProof,
            publicSignals,
            vk
        );

        events.on(ZkVerifyEvents.ErrorEvent, (error) => {
            errorEventEmitted = true;

            if (error instanceof Error) {
                expect(error.message).toContain('Invalid proof format');
            } else if (typeof error === 'object' && error !== null) {
                expect((error as { error: string }).error).toContain('Invalid proof format');
            } else {
                throw new Error(`Unexpected error type: ${typeof error}`);
            }
        });

        try {
            const transactionInfo = await transactionResult;
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Invalid proof format');
            } else if (typeof error === 'object' && error !== null) {
                expect((error as { error: string }).error).toContain('Invalid proof format');
            } else {
                throw new Error(`Unexpected error type: ${typeof error}`);
            }
        } finally {
            expect(errorEventEmitted).toBe(true);
            await session.close();
        }
    });

    it('should fail when sending groth16 data that passes formatting but is not accepted by zkVerify', async () => {
        const dataPath = path.join(__dirname, 'data', 'groth16_error.json');
        const groth16Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const { proof, publicSignals, vk } = groth16Data;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        let errorEventEmitted = false;

        const { events, transactionResult } = await session.verify(
            { proofType: 'groth16', waitForNewAttestationEvent: true },
            proof,
            publicSignals,
            vk
        );

        events.on(ZkVerifyEvents.ErrorEvent, (error) => {
            errorEventEmitted = true;

            if (error instanceof Error) {
                expect(error.message).toContain('InvalidProofData');
            } else if (typeof error === 'object' && error !== null) {
                expect((error as { error: string }).error).toContain('InvalidProofData');
            } else {
                throw new Error(`Unexpected error type: ${typeof error}`);
            }
        });

        try {
            const transactionInfo = await transactionResult;
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('InvalidProofData');
            } else if (typeof error === 'object' && error !== null) {
                expect((error as { error: string }).error).toContain('InvalidProofData');
            } else {
                throw new Error(`Unexpected error type: ${typeof error}`);
            }
        } finally {
            expect(errorEventEmitted).toBe(true);
            await session.close();
        }
    });
});

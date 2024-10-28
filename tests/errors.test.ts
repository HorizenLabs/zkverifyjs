import fs from 'fs';
import path from 'path';
import { zkVerifySession } from '../src';
import { ZkVerifyEvents } from "../src";
import { getSeedPhrase } from "./common/utils";

jest.setTimeout(180000);

function checkErrorMessage(error: unknown, expectedMessage: string): void {
    if (error instanceof Error) {
        expect(error.message).toContain(expectedMessage);
    } else if (typeof error === 'object' && error !== null) {
        const nestedMessage = (error as any)?.context?.message || JSON.stringify(error);
        expect(nestedMessage).toContain(expectedMessage);
    } else {
        throw new Error(`Unexpected error type: ${typeof error}`);
    }
}

describe('verify with bad data - Groth16', () => {
    let session: zkVerifySession;

    afterEach(async () => {
        if (session) await session.close();
    });

    it('should fail when sending groth16 data that cannot be formatted and emit an error event', async () => {
        const dataPath = path.join(__dirname, 'common/data', 'groth16_error.json');
        const groth16Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const badProof = { ...groth16Data.proof, pi_a: 'bad_data' };
        const { publicSignals, vk } = groth16Data;

        session = await zkVerifySession.start().Testnet().withAccount(getSeedPhrase(7));
        let errorEventEmitted = false;

        const { events, transactionResult } = await session.verify()
            .groth16().execute({
                proofData: {
                    proof: badProof,
                    publicSignals: publicSignals,
                    vk: vk
                }
            });

        events.on(ZkVerifyEvents.ErrorEvent, () => {
            errorEventEmitted = true;
        });

        try {
            const transactionInfo = await transactionResult;
        } catch (error) {
            checkErrorMessage(error, 'Failed to format groth16 proof');
        } finally {
            expect(errorEventEmitted).toBe(false);
        }
    });

    it('should fail and emit an error event when sending groth16 data that passes formatting but is not accepted by zkVerify', async () => {
        const dataPath = path.join(__dirname, 'common/data', 'groth16_error.json');
        const groth16Data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const { proof, publicSignals, vk } = groth16Data;
        session = await zkVerifySession.start().Testnet().withAccount(getSeedPhrase(7));
        let errorEventEmitted = false;

        const { events, transactionResult } = await session.verify()
            .groth16().execute({
                proofData: {
                    proof: proof,
                    publicSignals: publicSignals,
                    vk: vk
                }
            });

        events.on(ZkVerifyEvents.ErrorEvent, (error) => {
            errorEventEmitted = true;
            checkErrorMessage(error, 'Error creating submittable extrinsic');
        });

        try {
            const transactionInfo = await transactionResult;
        } catch (error) {
            checkErrorMessage(error, 'Error creating submittable extrinsic');
        } finally {
            expect(errorEventEmitted).toBe(true);
        }
    });
});

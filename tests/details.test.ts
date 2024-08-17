import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { zkVerifySession, ProofTransactionResult } from '../src';

jest.setTimeout(180000);

describe('verify and getProofDetails - Fflonk', () => {
    it('should send the fflonk proof for verification, receive the NewAttestation event, and retrieve proof details', async () => {
        const dataPath = path.join(__dirname, 'data', 'fflonk.json');
        const fflonkData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const { proof, publicSignals, vk } = fflonkData;

        const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: process.env.SEED_PHRASE });

        const { events, transactionResult } = await session.verifyAndWaitForAttestationEvent('fflonk', proof, publicSignals, vk);

        const result: ProofTransactionResult = await transactionResult;

        //TODO: This does not work, cannot find the underlying poe pallet or methods.
        const proofDetails = await session.getProofDetails(
            result.transactionInfo.attestationId!,
            result.transactionInfo.leafDigest!,
            result.transactionInfo.attestationEvent?.attestation!
        );

        console.log('Proof details:', proofDetails);
        expect(proofDetails).toBeDefined();
        expect(proofDetails.proofPath).toBeDefined();
        expect(proofDetails.attestation).toBe(result.transactionInfo.attestationEvent?.attestation);
        expect(proofDetails.leafIndex).toBeGreaterThanOrEqual(0);
        expect(proofDetails.numberOfLeaves).toBeGreaterThanOrEqual(0);
        expect(proofDetails.leaf).toBeDefined();

        await session.close();
    });
});

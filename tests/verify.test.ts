import { ProofType } from '../src';
import { performVerifyTransaction, performVKRegistrationAndVerification, loadProofData, loadVerificationKey } from './common/utils';

jest.setTimeout(300000);

describe('verify and subscribe to zkVerify proof events without waiting for Attestation event', () => {
    const proofTypes = Object.keys(ProofType).map((key) => ProofType[key as keyof typeof ProofType]);

    test.each(proofTypes)('should verify %s proof and respond on finalization', async (proofType: ProofType) => {
        console.log(`Running test for proof type: ${proofType}`);

        const { proof, publicSignals } = loadProofData(proofType);
        const vk = loadVerificationKey(proofType);

        await performVerifyTransaction(proofType, proof, publicSignals, vk, false);
    });
});

describe('verify and subscribe to zkVerify events, wait for Attestation event then call proof of existence', () => {
    const proofTypes = Object.keys(ProofType).map((key) => ProofType[key as keyof typeof ProofType]);

    test.each(proofTypes)('should verify %s proof and respond on finalization with attestation confirmation then check proof of existence', async (proofType: ProofType) => {
        console.log(`Running test for proof type: ${proofType}`);
        const { proof, publicSignals } = loadProofData(ProofType.groth16);
        const vk = loadVerificationKey(ProofType.groth16);

        await performVerifyTransaction(ProofType.groth16, proof, publicSignals, vk, true, true);
    });
});

describe('Register a VK and and then verify using the VK hash - All Proof Types', () => {
    const proofTypes = Object.keys(ProofType).map((key) => ProofType[key as keyof typeof ProofType]);

    test.each(proofTypes)('should register and verify %s proof and respond on finalization', async (proofType: ProofType) => {
        const { proof, publicSignals } = loadProofData(proofType);
        const vk = loadVerificationKey(proofType);

        await performVKRegistrationAndVerification(proofType, proof, publicSignals, vk);
    });
});

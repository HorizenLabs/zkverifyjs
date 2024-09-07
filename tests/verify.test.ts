import { ProofType, Groth16CurveType } from '../src';
import { performVerifyTransaction, performVKRegistrationAndVerification, loadProofData, loadVerificationKey } from './common/utils';

jest.setTimeout(300000);

const proofTypes = Object.keys(ProofType).map((key) => ProofType[key as keyof typeof ProofType]);
const curveTypes = Object.keys(Groth16CurveType).map((key) => Groth16CurveType[key as keyof typeof Groth16CurveType]);

const loadProofAndVK = (proofType: ProofType, curve?: string) => {
    if (proofType === ProofType.groth16 && curve) {
        return {
            proof: loadProofData(proofType, curve),
            vk: loadVerificationKey(proofType, curve)
        };
    } else {
        return {
            proof: loadProofData(proofType),
            vk: loadVerificationKey(proofType)
        };
    }
};

const runVerifyTest = async (proofType: ProofType, withAttestation: boolean = false, checkExistence: boolean = false) => {
    if (proofType === ProofType.groth16) {
        for (const curve of curveTypes) {
            console.log(`Running ${proofType} test with curve: ${curve}`);
            const { proof, vk } = loadProofAndVK(proofType, curve);

            await performVerifyTransaction(proofType, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
        }
    } else {
        const { proof, vk } = loadProofAndVK(proofType);
        await performVerifyTransaction(proofType, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
    }
};

const runVKRegistrationTest = async (proofType: ProofType) => {
    if (proofType === ProofType.groth16) {
        for (const curve of curveTypes) {
            console.log(`Running VK registration for ${proofType} with curve: ${curve}`);
            const { proof, vk } = loadProofAndVK(proofType, curve);

            await performVKRegistrationAndVerification(proofType, proof.proof, proof.publicSignals, vk);
        }
    } else {
        const { proof, vk } = loadProofAndVK(proofType);
        await performVKRegistrationAndVerification(proofType, proof.proof, proof.publicSignals, vk);
    }
};

describe('zkVerify proof user journey tests', () => {
    test.each(proofTypes)(
        'should verify %s proof and respond on finalization without waiting for Attestation event',
        async (proofType: ProofType) => {
            console.log(`Running test for proof type: ${proofType}`);
            await runVerifyTest(proofType, false, false);
        }
    );

    test.each(proofTypes)(
        'should verify %s proof, wait for Attestation event, then check proof of existence',
        async (proofType: ProofType) => {
            console.log(`Running test for proof type: ${proofType}`);
            await runVerifyTest(proofType, true, true);
        }
    );

    test.each(proofTypes)(
        'should register a VK and then verify the proof using the VK hash - %s proof',
        async (proofType: ProofType) => {
            await runVKRegistrationTest(proofType);
        }
    );
});

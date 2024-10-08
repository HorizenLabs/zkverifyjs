import { ProofType, Groth16CurveType } from '../src';
import {
    performVerifyTransaction,
    performVKRegistrationAndVerification,
    loadProofData,
    loadVerificationKey,
    getSeedPhrase
} from './common/utils';

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

const runVerifyTest = async (
    proofType: ProofType,
    withAttestation: boolean = false,
    checkExistence: boolean = false,
    seedPhrase: string,
    curve?: string
) => {
    if (proofType === ProofType.groth16 && curve) {
        console.log(`Running ${proofType} test with curve: ${curve}`);
        const { proof, vk } = loadProofAndVK(proofType, curve);
        await performVerifyTransaction(seedPhrase, proofType, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
    } else {
        console.log(`Running ${proofType} test`);
        const { proof, vk } = loadProofAndVK(proofType);
        await performVerifyTransaction(seedPhrase, proofType, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
    }
};

const runVKRegistrationTest = async (proofType: ProofType, seedPhrase: string) => {
    if (proofType === ProofType.groth16) {
        for (const curve of curveTypes) {
            console.log(`Running VK registration for ${proofType} with curve: ${curve}`);
            const { proof, vk } = loadProofAndVK(proofType, curve);
            await performVKRegistrationAndVerification(seedPhrase, proofType, proof.proof, proof.publicSignals, vk);
        }
    } else {
        console.log(`Running VK registration for ${proofType}`);
        const { proof, vk } = loadProofAndVK(proofType);
        await performVKRegistrationAndVerification(seedPhrase, proofType, proof.proof, proof.publicSignals, vk);
    }
};

const runAllProofTests = async (
    proofTypes: ProofType[],
    curveTypes: Groth16CurveType[],
    withAttestation: boolean
) => {
    const testPromises: Promise<void>[] = [];
    let seedIndex = 0;

    proofTypes.forEach((proofType) => {
        if (proofType === ProofType.groth16) {
            curveTypes.forEach((curve) => {
                console.log(`${proofType} ${curve} Seed Index: ${seedIndex}`);
                const seedPhrase = getSeedPhrase(seedIndex++);
                testPromises.push(runVerifyTest(proofType, withAttestation, false, seedPhrase, curve));
            });
        } else {
            console.log(`${proofType} Seed Index: ${seedIndex}`);
            const seedPhrase = getSeedPhrase(seedIndex++);
            testPromises.push(runVerifyTest(proofType, withAttestation, false, seedPhrase));
        }
    });

    await Promise.allSettled(testPromises);
};

const runAllVKRegistrationTests = async (proofTypes: ProofType[], curveTypes: Groth16CurveType[]) => {
    const testPromises: Promise<void>[] = [];
    let seedIndex = 0;

    proofTypes.forEach((proofType) => {
        if (proofType === ProofType.groth16) {
            curveTypes.forEach((curve) => {
                const seedPhrase = getSeedPhrase(seedIndex++);
                testPromises.push(runVKRegistrationTest(proofType, seedPhrase));
            });
        } else {
            const seedPhrase = getSeedPhrase(seedIndex++);
            testPromises.push(runVKRegistrationTest(proofType, seedPhrase));
        }
    });

    await Promise.allSettled(testPromises);
};

describe('zkVerify proof user journey tests', () => {
    test('should verify all proof types and respond on finalization without waiting for Attestation event', async () => {
        await runAllProofTests(proofTypes, curveTypes, false);
    });

    test('should verify all proof types, wait for Attestation event, and then check proof of existence', async () => {
        await runAllProofTests(proofTypes, curveTypes, true);
    });

    test('should register VK and verify the proof using the VK hash for all proof types', async () => {
        await runAllVKRegistrationTests(proofTypes, curveTypes);
    });
});

import { Groth16CurveType, ProofType } from "../../src";
import {
    curveTypes,
    getSeedPhrase,
    loadProofAndVK,
    performVerifyTransaction,
    performVKRegistrationAndVerification
} from "./utils";

export const runVerifyTest = async (
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

export const runVKRegistrationTest = async (proofType: ProofType, seedPhrase: string) => {
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

export const runAllProofTests = async (
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

export const runAllVKRegistrationTests = async (proofTypes: ProofType[], curveTypes: Groth16CurveType[]) => {
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
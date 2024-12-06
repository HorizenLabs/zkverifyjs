import { CurveType, Library, ProofOptions, ProofType } from "../../src";
import {
    getSeedPhrase,
    loadProofAndVK,
    performVerifyTransaction,
    performVKRegistrationAndVerification
} from "./utils";

const logTestDetails = (proofOptions: ProofOptions, testType: string) => {
    const { proofType, library, curve } = proofOptions;
    const details = [library && `library: ${library}`, curve && `curve: ${curve}`].filter(Boolean).join(", ");
    console.log(`Running ${testType} for ${proofType}${details ? ` with ${details}` : ""}`);
};

export const runVerifyTest = async (
    proofOptions: ProofOptions,
    withAttestation: boolean = false,
    checkExistence: boolean = false,
    seedPhrase: string
) => {
    logTestDetails(proofOptions, "verification test");
    const { proof, vk } = loadProofAndVK(proofOptions);
    await performVerifyTransaction(seedPhrase, proofOptions, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
};

export const runVKRegistrationTest = async (proofOptions: ProofOptions, seedPhrase: string) => {
    logTestDetails(proofOptions, "VK registration");
    const { proof, vk } = loadProofAndVK(proofOptions);
    await performVKRegistrationAndVerification(seedPhrase, proofOptions, proof.proof, proof.publicSignals, vk);
};

const generateTestPromises = (
    proofTypes: ProofType[],
    curveTypes: CurveType[],
    libraries: Library[],
    runTest: (proofOptions: ProofOptions, seedPhrase: string) => Promise<void>
): Promise<void>[] => {
    const promises: Promise<void>[] = [];
    let seedIndex = 0;

    proofTypes.forEach((proofType) => {
        if (proofType === ProofType.groth16) {
            libraries.forEach((library) => {
                curveTypes.forEach((curve) => {
                    const seedPhrase = getSeedPhrase(seedIndex++);
                    promises.push(runTest({ proofType, curve, library }, seedPhrase));
                });
            });
        } else {
            const seedPhrase = getSeedPhrase(seedIndex++);
            promises.push(runTest({ proofType }, seedPhrase));
        }
    });

    return promises;
};

export const runAllProofTests = async (
    proofTypes: ProofType[],
    curveTypes: CurveType[],
    libraries: Library[],
    withAttestation: boolean
) => {
    const testPromises = generateTestPromises(proofTypes, curveTypes, libraries, (proofOptions, seedPhrase) =>
        runVerifyTest(proofOptions, withAttestation, false, seedPhrase)
    );
    await Promise.all(testPromises);
};

export const runAllVKRegistrationTests = async (
    proofTypes: ProofType[],
    curveTypes: CurveType[],
    libraries: Library[]
) => {
    const testPromises = generateTestPromises(proofTypes, curveTypes, libraries, runVKRegistrationTest);
    await Promise.all(testPromises);
};

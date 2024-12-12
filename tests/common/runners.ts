import { CurveType, Library, ProofOptions, ProofType } from "../../src";
import {
    loadProofAndVK,
    performVerifyTransaction,
    performVKRegistrationAndVerification
} from "./utils";
import { walletPool } from "./walletPool";

const logTestDetails = (proofOptions: ProofOptions, testType: string) => {
    const { proofType, library, curve } = proofOptions;
    const details = [library && `library: ${library}`, curve && `curve: ${curve}`].filter(Boolean).join(", ");
    console.log(`Running ${testType} for ${proofType}${details ? ` with ${details}` : ""}`);
};

export const runVerifyTest = async (
    proofOptions: ProofOptions,
    withAttestation: boolean = false,
    checkExistence: boolean = false
) => {
    let seedPhrase: string | undefined;
    try {
        seedPhrase = await walletPool.acquireWallet();
        logTestDetails(proofOptions, "verification test");
        const { proof, vk } = loadProofAndVK(proofOptions);
        await performVerifyTransaction(seedPhrase, proofOptions, proof.proof, proof.publicSignals, vk, withAttestation, checkExistence);
    } catch (error) {
        console.error(`Error during runVerifyTest for ${proofOptions.proofType}:`, error);
        throw error;
    } finally {
        if (seedPhrase) {
            await walletPool.releaseWallet(seedPhrase);
        }
    }
};

export const runVKRegistrationTest = async (proofOptions: ProofOptions) => {
    let seedPhrase: string | undefined;
    try {
        seedPhrase = await walletPool.acquireWallet();
        logTestDetails(proofOptions, "VK registration");
        const { proof, vk } = loadProofAndVK(proofOptions);
        await performVKRegistrationAndVerification(seedPhrase, proofOptions, proof.proof, proof.publicSignals, vk);
    } catch (error) {
        console.error(`Error during runVKRegistrationTest for ${proofOptions.proofType}:`, error);
        throw error;
    } finally {
        if (seedPhrase) {
            await walletPool.releaseWallet(seedPhrase);
        }
    }
};

const generateTestPromises = (
    proofTypes: ProofType[],
    curveTypes: CurveType[],
    libraries: Library[],
    runTest: (proofOptions: ProofOptions) => Promise<void>
): Promise<void>[] => {
    const promises: Promise<void>[] = [];

    proofTypes.forEach((proofType) => {
        if (proofType === ProofType.groth16) {
            libraries.forEach((library) => {
                curveTypes.forEach((curve) => {
                    promises.push(runTest({ proofType, curve, library }));
                });
            });
        } else {
            promises.push(runTest({ proofType }));
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
    const testPromises = generateTestPromises(proofTypes, curveTypes, libraries, (proofOptions) =>
        runVerifyTest(proofOptions, withAttestation, false)
    );

    const results = await Promise.allSettled(testPromises);
    const failures = results.filter(result => result.status === 'rejected');

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Test ${index} failed:`, result.reason);
        } else {
            console.debug(`Test ${index} succeeded.`);
        }
    });

    if (failures.length > 0) {
        throw new Error(`${failures.length} test(s) failed. See logs for details.`);
    }
};

export const runAllVKRegistrationTests = async (
    proofTypes: ProofType[],
    curveTypes: CurveType[],
    libraries: Library[]
) => {
    const testPromises = generateTestPromises(proofTypes, curveTypes, libraries, runVKRegistrationTest);
    await Promise.all(testPromises);
};

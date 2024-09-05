import {
    zkVerifySession,
    ProofType,
    TransactionInfo,
    TransactionStatus,
    VerifyTransactionInfo,
    VKRegistrationTransactionInfo
} from '../../src';
import {
    handleCommonEvents,
    handleEventsWithAttestation,
    EventResults,
} from './eventHandlers';
import path from "path";
import fs from "fs";


export interface ProofData {
    proof: any;
    publicSignals: any;
    vk?: string;
}

export const loadProofData = (proofType: ProofType): ProofData => {
    const dataPath = path.join(__dirname, 'data', `${proofType}.json`);
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

export const loadVerificationKey = (proofType: ProofType): string => {
    if (proofType === ProofType.ultraplonk) {
        const vkPath = path.join(__dirname, 'data', 'ultraplonk_vk.bin');
        return fs.readFileSync(vkPath).toString('hex');
    } else {
        const dataPath = path.join(__dirname, 'data', `${proofType}.json`);
        const proofData: ProofData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        return proofData.vk!;
    }
};

export const validateEventResults = (eventResults: EventResults, expectAttestation: boolean): void => {
    expect(eventResults.broadcastEmitted).toBe(true);
    expect(eventResults.includedInBlockEmitted).toBe(true);
    expect(eventResults.finalizedEmitted).toBe(true);
    expect(eventResults.errorEventEmitted).toBe(false);

    if (expectAttestation) {
        expect(eventResults.attestationConfirmedEmitted).toBe(true);
    } else {
        expect(eventResults.attestationConfirmedEmitted).toBe(false);
    }
    expect(eventResults.attestationBeforeExpectedEmitted).toBe(false);
    expect(eventResults.attestationMissedEmitted).toBe(false);
};

export const performVerifyTransaction = async (
    proofType: ProofType,
    proof: any,
    publicSignals: any,
    vk: string,
    withAttestation: boolean,
    validatePoe: boolean = false
): Promise<{ eventResults: EventResults; transactionInfo: VerifyTransactionInfo }> => {
    const session = await zkVerifySession.start().Testnet().withAccount(process.env.SEED_PHRASE!);

    console.log(`${proofType} Executing transaction...`);
    const verifier = session.verify()[proofType]();
    const verify = withAttestation ? verifier.waitForPublishedAttestation() : verifier;

    const { events, transactionResult } = await verify.execute(proof, publicSignals, vk);

    console.log(`${proofType} Setting up event listeners...`);
    const eventResults = withAttestation
        ? handleEventsWithAttestation(events, proofType, 'verify')
        : handleCommonEvents(events, proofType, 'verify');

    console.log(`${proofType} Transaction result received. Validating...`);

    const transactionInfo: VerifyTransactionInfo = await transactionResult;
    validateVerifyTransactionInfo(transactionInfo, proofType, withAttestation);
    validateEventResults(eventResults, withAttestation);

    if (validatePoe) {
        await validatePoE(session, transactionInfo.attestationId!, transactionInfo.leafDigest!);
    }

    console.log(`${proofType} Closing session...`);
    await session.close();

    return { eventResults, transactionInfo };
};


export const performVKRegistrationAndVerification = async (
    proofType: ProofType,
    proof: any,
    publicSignals: any,
    vk: string
): Promise<void> => {
    const session = await zkVerifySession.start().Testnet().withAccount(process.env.SEED_PHRASE!);

    console.log(`${proofType} Executing VK registration and setting up event listeners...`);
    const { events: registerEvents, transactionResult: registerTransactionResult } = await session.registerVerificationKey()[proofType]().execute(vk);

    const registerResults = handleCommonEvents(registerEvents, proofType, 'vkRegistration');

    const vkTransactionInfo: VKRegistrationTransactionInfo = await registerTransactionResult;
    validateVKRegistrationTransactionInfo(vkTransactionInfo, proofType);
    validateEventResults(registerResults, false);

    console.log(`${proofType} Executing verification using registered VK and setting up event listeners...`);
    const { events: verifyEvents, transactionResult: verifyTransactionResult } = await session.verify()[proofType]().withRegisteredVk().execute(proof, publicSignals, vkTransactionInfo.statementHash!);
    const verifyResults = handleCommonEvents(verifyEvents, proofType, 'verify');

    const verifyTransactionInfo: VerifyTransactionInfo = await verifyTransactionResult;
    validateVerifyTransactionInfo(verifyTransactionInfo, proofType, false);
    validateEventResults(verifyResults, false);

    console.log(`${proofType} Closing session...`);
    await session.close();
};


export const validateTransactionInfo = (
    transactionInfo: TransactionInfo,
    expectedProofType: string
): void => {
    expect(transactionInfo).toBeDefined();
    expect(transactionInfo.blockHash).not.toBeNull();
    expect(transactionInfo.proofType).toBe(expectedProofType);
    expect(transactionInfo.status).toBe(TransactionStatus.Finalized);
    expect(transactionInfo.txHash).toBeDefined();
    expect(transactionInfo.extrinsicIndex).toBeDefined();
    expect(transactionInfo.feeInfo).toBeDefined();
    expect(transactionInfo.weightInfo).toBeDefined();
    expect(transactionInfo.txClass).toBeDefined();
};

export const validateVerifyTransactionInfo = (
    transactionInfo: VerifyTransactionInfo,
    expectedProofType: string,
    expectAttestation: boolean
): void => {
    validateTransactionInfo(transactionInfo, expectedProofType);

    expect(transactionInfo.attestationId).not.toBeNull();
    expect(transactionInfo.leafDigest).not.toBeNull();

    if(expectAttestation) {
        expect(transactionInfo.attestationConfirmed).toBeTruthy();
        expect(transactionInfo.attestationEvent).toBeDefined();
        expect(transactionInfo.attestationEvent!.id).toBeDefined();
        expect(transactionInfo.attestationEvent!.attestation).toBeDefined();
    } else {
        expect(transactionInfo.attestationConfirmed).toBeFalsy();
        expect(transactionInfo.attestationEvent).not.toBeDefined();
    }
};

export const validateVKRegistrationTransactionInfo = (
    transactionInfo: VKRegistrationTransactionInfo,
    expectedProofType: string
): void => {
    validateTransactionInfo(transactionInfo, expectedProofType);
    expect(transactionInfo.statementHash).toBeDefined();
};


export const validatePoE = async (
    session: zkVerifySession,
    attestationId: number,
    leafDigest: string
): Promise<void> => {
    const proofDetails = await session.poe(attestationId, leafDigest);

    expect(proofDetails).toBeDefined();
    expect(proofDetails.root).toBeDefined();
    expect(proofDetails.leafIndex).toBeGreaterThanOrEqual(0);
    expect(proofDetails.numberOfLeaves).toBeGreaterThanOrEqual(0);
    expect(proofDetails.leaf).toBeDefined();
};
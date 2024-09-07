import { ZkVerifyEvents, TransactionStatus } from '../../src';

export interface EventResults {
    includedInBlockEmitted: boolean;
    finalizedEmitted: boolean;
    errorEventEmitted: boolean;
    attestationConfirmedEmitted?: boolean;
    attestationBeforeExpectedEmitted?: boolean;
    attestationMissedEmitted?: boolean;
    broadcastEmitted?: boolean;
    unsubscribeEmitted?: boolean;
}

export const handleCommonEvents = (
    events: any,
    expectedProofType: string,
    expectedDataType: 'verify' | 'vkRegistration',
): EventResults => {
    const eventResults: EventResults = {
        includedInBlockEmitted: false,
        finalizedEmitted: false,
        errorEventEmitted: false,
        attestationConfirmedEmitted: false,
        attestationBeforeExpectedEmitted: false,
        attestationMissedEmitted: false,
        broadcastEmitted: false,
        unsubscribeEmitted: false,
    };

    events.on(ZkVerifyEvents.ErrorEvent, () => {
        eventResults.errorEventEmitted = true;
    });

    events.on(ZkVerifyEvents.IncludedInBlock, (eventData: any) => {
        eventResults.includedInBlockEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.blockHash).not.toBeNull();
        expect(eventData.proofType).toBe(expectedProofType);
        expect(eventData.status).toBe(TransactionStatus.InBlock);
        expect(eventData.txHash).toBeDefined();

        if (expectedDataType === 'vkRegistration') {
            expect(eventData.statementHash).toBeDefined();
            expect(eventData.attestationId).toBeUndefined();
            expect(eventData.leafDigest).toBeUndefined();
        } else if (expectedDataType === 'verify') {
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.statementHash).toBeUndefined();
        }
    });

    events.on(ZkVerifyEvents.Finalized, (eventData: any) => {
        eventResults.finalizedEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.blockHash).not.toBeNull();
        expect(eventData.proofType).toBe(expectedProofType);
        expect(eventData.status).toBe(TransactionStatus.Finalized);
        expect(eventData.txHash).toBeDefined();

        if (expectedDataType === 'vkRegistration') {
            expect(eventData.statementHash).toBeDefined();
            expect(eventData.attestationId).toBeUndefined();
            expect(eventData.leafDigest).toBeUndefined();
        } else if (expectedDataType === 'verify') {
            expect(eventData.attestationId).not.toBeNull();
            expect(eventData.leafDigest).not.toBeNull();
            expect(eventData.statementHash).toBeUndefined();
        }
    });

    events.on(ZkVerifyEvents.Broadcast, (eventData: any) => {
        eventResults.broadcastEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.txHash).toBeDefined();
    });

    events.on(ZkVerifyEvents.Unsubscribe, () => {
        eventResults.unsubscribeEmitted = true;
    });

    return eventResults;
};

export const handleEventsWithAttestation = (
    events: any,
    expectedProofType: string,
    expectedDataType: 'verify' | 'vkRegistration',
): EventResults => {
    const results = handleCommonEvents(events, expectedProofType, expectedDataType);

    events.on(ZkVerifyEvents.AttestationConfirmed, (eventData: any) => {
        results.attestationConfirmedEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.attestationId).not.toBeNull();
        expect(eventData.leafDigest).not.toBeNull();
    });

    events.on(ZkVerifyEvents.AttestationBeforeExpected, (eventData: any) => {
        results.attestationBeforeExpectedEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.attestationId).not.toBeNull();
        expect(eventData.leafDigest).not.toBeNull();
    });

    events.on(ZkVerifyEvents.AttestationMissed, (eventData: any) => {
        results.attestationBeforeExpectedEmitted = true;
        expect(eventData).toBeDefined();
        expect(eventData.attestationId).not.toBeNull();
        expect(eventData.leafDigest).not.toBeNull();
    });

    return results;
};

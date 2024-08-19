export enum TransactionType {
    Verify = 1,
    VKRegistration = 2,
}

export enum ZkVerifyEvents {
    Unsubscribe = 'unsubscribe',
    IncludedInBlock = 'includedInBlock',
    ErrorEvent = 'error',
    Finalized = 'finalized',
    Broadcast = 'broadcast',
    AttestationConfirmed = 'attestationConfirmed',
    AttestationBeforeExpected = 'attestationBeforeExpected',
    AttestationMissed = 'attestationMissed',
}

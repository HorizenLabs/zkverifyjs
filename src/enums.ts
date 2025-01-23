export enum TransactionType {
  Verify = 1,
  VKRegistration = 2,
}

export enum TransactionStatus {
  Broadcast = 'broadcast',
  Dropped = 'dropped',
  Error = 'error',
  Finalized = 'finalized',
  InBlock = 'inBlock',
  Invalid = 'invalid',
  Pending = 'pending',
  Retracted = 'retracted',
  Usurped = 'usurped',
}

export enum ZkVerifyEvents {
  AttestationBeforeExpected = 'attestationBeforeExpected',
  AttestationConfirmed = 'attestationConfirmed',
  AttestationMissed = 'attestationMissed',
  Broadcast = 'broadcast',
  ErrorEvent = 'error',
  Finalized = 'finalized',
  IncludedInBlock = 'includedInBlock',
  Unsubscribe = 'unsubscribe',
}

export enum Risc0Version {
  V1_0 = 'V1_0',
  V1_1 = 'V1_1',
  V1_2 = 'V1_2',
}

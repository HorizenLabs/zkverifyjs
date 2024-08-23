export enum ProofType {
  fflonk = 'fflonk',
  groth16 = 'groth16',
  risc0 = 'risc0',
}
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

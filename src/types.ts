import { TransactionStatus } from './enums';

export interface ProofProcessor {
  formatProof(proof: unknown, publicSignals?: string[]): unknown;
  formatVk(vkJson: unknown): unknown;
  formatPubs(pubs: unknown): unknown;
}

export interface ProofTransactionResult {
  transactionInfo: TransactionInfo;
  finalized: boolean;
  attestationConfirmed: boolean;
}

export interface TransactionInfo {
  blockHash: string;
  proofType: string;
  status: TransactionStatus;
  txHash?: string;
  extrinsicIndex?: number;
  feeInfo?: {
    payer: string;
    actualFee: string;
    tip: string;
    paysFee: string;
  };
  weightInfo?: {
    refTime?: string;
    proofSize?: string;
  };
  txClass?: string;
}

export interface VerifyTransactionInfo extends TransactionInfo {
  attestationId: number | undefined;
  leafDigest: string | null;
  attestationConfirmed: boolean;
  attestationEvent?: AttestationEvent;
}

export interface VKRegistrationTransactionInfo extends TransactionInfo {
  statementHash?: string;
}

export interface AccountInfo {
  address: string;
  nonce: number;
  freeBalance: string;
  reservedBalance: string;
}

export interface AttestationEvent {
  id: number;
  attestation: string;
}

export interface MerkleProof {
  root: string;
  proof: string[];
  numberOfLeaves: number;
  leafIndex: number;
  leaf: string;
}

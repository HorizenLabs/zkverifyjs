import { TransactionStatus } from './enums';
import { ProofType } from './config';

export interface ProofProcessor {
  formatProof(proof: unknown, options?: unknown): unknown;
  formatVk(vkJson: unknown, options?: unknown): unknown;
  formatPubs(pubs: unknown, options?: unknown): unknown;
}

export interface ProofData {
  proof: unknown;
  publicSignals: unknown;
  vk?: unknown;
}

export interface TransactionInfo {
  blockHash: string;
  proofType: ProofType;
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

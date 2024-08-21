import {TransactionStatus} from "./enums";

export interface ProofInner {
    a: string;
    b: string;
    c: string;
}

export type ProofType<T> = ProofInner | T | string;

export interface Proof<T> {
    curve?: string;
    proof: ProofType<T>;
}

export interface ProofData<T> {
    proof: T;
    publicSignals: string | string[];
    vk?: any;
}

export interface ProofProcessor {
    formatProof(proof: any, publicSignals?: string[]): any;
    formatVk(vkJson: any): any;
    formatPubs(pubs: any): any;
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
        refTime: string;
        proofSize: string;
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


export interface VerifyTransactionInfo extends TransactionInfo {
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

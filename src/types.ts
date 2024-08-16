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
    formatPubs(pubs: string[]): any;

    processProofData(...rawData: any[]): {
        formattedProof: any,
        formattedVk: any,
        formattedPubs: any
    };
}

export interface ProofTransactionResult {
    attestationId: string | null;
    finalized: boolean;
    attestationConfirmed: boolean;
    blockHash: string | null;
    proofLeaf: string | null;
}

export interface TransactionInfo {
    blockHash: string;
    proofType: string;
    attestationId: string | null;
    proofLeaf: string | null;
    status: 'inBlock' | 'finalized';
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

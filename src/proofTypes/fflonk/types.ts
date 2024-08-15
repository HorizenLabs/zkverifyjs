export interface FflonkVerificationKey {
    power: number;
    k1: string;
    k2: string;
    w: string;
    w3: string;
    w4: string;
    w8: string;
    wr: string;
    X_2: [string[], string[], string[]];
    C0: [string, string, string];
    x2: [string[], string[], string[]];
    c0: [string, string, string];
}

export interface FflonkProof {
    polynomials: {
        C1: string[];
        C2: string[];
        W1: string[];
        W2: string[];
    };
    evaluations: {
        ql: string;
        qr: string;
        qm: string;
        qo: string;
        qc: string;
        s1: string;
        s2: string;
        s3: string;
        a: string;
        b: string;
        c: string;
        z: string;
        zw: string;
        t1w: string;
        t2w: string;
        inv: string;
    };
}

export type FflonkPublicSignals = string[];

export interface FflonkRawData {
    proof: FflonkProof;
    vk: FflonkVerificationKey;
    publicSignals: FflonkPublicSignals;
}

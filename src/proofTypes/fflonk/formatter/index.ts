import { FflonkVerificationKey, FflonkProof, FflonkPublicSignals } from "../types";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BigNumber } = require('bignumber.js');


/**
 * Formats the FFLONK verification key.
 *
 * @param {FflonkVerificationKey | string} vkJson - The raw verification key data, either as a JSON string or an object.
 * @returns {FflonkVerificationKey} - The formatted verification key.
 */
export const formatVk = (vkJson: FflonkVerificationKey | string): FflonkVerificationKey => {
    const vkObject = typeof vkJson === 'string' ? JSON.parse(vkJson) : vkJson;

    return {
        power: vkObject.power,
        k1: vkObject.k1,
        k2: vkObject.k2,
        w: vkObject.w,
        w3: vkObject.w3,
        w4: vkObject.w4,
        w8: vkObject.w8,
        wr: vkObject.wr,
        X_2: vkObject.X_2,
        C0: vkObject.C0,
        get x2() { return this.X_2; },
        get c0() { return this.C0; }
    };
};

/**
 * Converts a number string to a 32-byte hexadecimal string.
 *
 * @param {string} numStr - The number string to convert.
 * @returns {string} - The 32-byte hexadecimal string.
 */
export const to32ByteHex = (numStr: string): string => {
    const hexStr = BigInt(numStr).toString(16);
    return hexStr.padStart(64, '0');
};

/**
 * Formats the FFLONK proof data.
 *
 * @param {FflonkProof} proof - The raw proof data.
 * @returns {string} - The formatted proof data as a single hexadecimal string.
 */
export const formatProof = (proof: FflonkProof): string => {
    const formatG1 = (g1: string[]): string[] => g1.slice(0, 2).map(to32ByteHex);

    const formattedPolynomials = [
        ...formatG1(proof.polynomials.C1),
        ...formatG1(proof.polynomials.C2),
        ...formatG1(proof.polynomials.W1),
        ...formatG1(proof.polynomials.W2),
    ];

    const formattedEvaluations = [
        proof.evaluations.ql, proof.evaluations.qr, proof.evaluations.qm, proof.evaluations.qo, proof.evaluations.qc,
        proof.evaluations.s1, proof.evaluations.s2, proof.evaluations.s3,
        proof.evaluations.a, proof.evaluations.b, proof.evaluations.c,
        proof.evaluations.z, proof.evaluations.zw, proof.evaluations.t1w, proof.evaluations.t2w, proof.evaluations.inv
    ].map(to32ByteHex);

    const combined = [...formattedPolynomials, ...formattedEvaluations];
    if (combined.length !== 24) {
        throw new Error(`Formatted proof length mismatch. Expected 24 elements, got ${combined.length}`);
    }

    const proofHex = combined.join('');
    if (proofHex.length !== 1536) {
        throw new Error(`Formatted proof length mismatch. Expected 1536 hex characters, got ${proofHex.length}`);
    }

    return '0x' + proofHex;
};

/**
 * Formats the first public signal by converting it to a hexadecimal string.
 *
 * @param {FflonkPublicSignals} pubs - The array of public signals to format. Assumes the array contains at least one element.
 * @returns {string} - The formatted hexadecimal string of the first public signal, padded to 64 characters.
 */
export const formatPubs = (pubs: FflonkPublicSignals): string => {
    return "0x" + BigNumber(pubs[0]).toString(16).padStart(64, '0');
};

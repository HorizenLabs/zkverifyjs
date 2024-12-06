import { CurveType } from '../../../config';

/**
 * Recursively converts numeric strings and hexadecimal strings in an object, array, or string
 * to `bigint`. Handles nested arrays and objects.
 */
export const unstringifyBigInts = (o: unknown): unknown => {
    if (typeof o === 'string' && /^[0-9]+$/.test(o)) return BigInt(o);
    if (typeof o === 'string' && /^0x[0-9a-fA-F]+$/.test(o)) return BigInt(o);
    if (Array.isArray(o)) return o.map(unstringifyBigInts);
    if (typeof o === 'object' && o !== null) {
        const result: Record<string, unknown> = {};
        for (const key in o) {
            if (Object.prototype.hasOwnProperty.call(o, key)) {
                result[key] = unstringifyBigInts((o as Record<string, unknown>)[key]);
            }
        }
        return result;
    }
    return o;
};

/**
 * Determines endianess based on the curve type.
 */
export const getEndianess = (curve: string): 'LE' | 'BE' => {
    return curve.toLowerCase() === 'bn254' ? 'LE' : 'BE';
};

/**
 * Extracts and normalizes curve type.
 */
export const extractCurve = (curve: CurveType): string => {
    if (curve === CurveType.bn128 || curve === CurveType.bn254) return 'bn254';
    if (curve === CurveType.bls12381) return 'Bls12_381';
    throw new Error(`Unsupported curve: ${curve}`);
};

/**
 * Converts bigint to a hexadecimal string based on endianess.
 */
export const toHex = (
    value: bigint,
    length: number,
    endianess: 'LE' | 'BE',
): string => {
    const hex = value.toString(16).padStart(length * 2, '0');
    const reversed = hex.match(/.{1,2}/g)!.reverse().join('');
    return `0x${endianess === 'LE' ? reversed : hex}`;
};

/**
 * Formats a G1 point based on endianess.
 */
export const formatG1Point = (point: string[], endianess: 'LE' | 'BE'): string => {
    const [x, y] = [BigInt(point[0]), BigInt(point[1])];
    return toHex(x, endianess === 'LE' ? 32 : 48, endianess) +
        toHex(y, endianess === 'LE' ? 32 : 48, endianess).slice(2);
};

/**
 * Formats a G2 point based on endianess and curve type.
 */
export const formatG2Point = (
    point: string[][],
    endianess: 'LE' | 'BE',
    curve: string,
): string => {
    const [x1, x2, y1, y2] = [
        BigInt(point[0][0]),
        BigInt(point[0][1]),
        BigInt(point[1][0]),
        BigInt(point[1][1]),
    ];
    return (
        formatG1Point([curve === 'Bls12_381' ? x2.toString() : x1.toString(), x2.toString()], endianess) +
        formatG1Point([curve === 'Bls12_381' ? y2.toString() : y1.toString(), y2.toString()], endianess).slice(2)
    );
};

/**
 * Formats a scalar as little-endian hexadecimal string.
 */
export const formatScalar = (scalar: string): string => toHex(BigInt(scalar), 32, 'LE');

/**
 * Formats an array of public signals.
 *
 * @param {string[]} pubs - Array of public signals.
 * @returns {string[]} - Formatted public signals.
 */
export const formatPublicSignals = (pubs: string[]): string[] => {
    if (!Array.isArray(pubs) || pubs.some(() => false)) {
        throw new Error(
            'Invalid public signals format: Expected an array of strings.',
        );
    }
    return pubs.map(formatScalar);
};
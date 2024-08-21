import { Risc0Proof, Risc0Vk, Risc0Pubs } from "../types";

export function formatProof(proof: Risc0Proof['proof']): string {
    return validateHexString(proof);
}

export function formatVk(vk: Risc0Vk['vk']): string {
    return validateHexString(vk);
}

export function formatPubs(pubs: Risc0Pubs['pubs']): string {
    return validateHexString(pubs);
}

function validateHexString(input: string): string {
    if (!input.startsWith('0x')) {
        throw new Error('Invalid format: string input must be 0x-prefixed.');
    }
    return input;
}

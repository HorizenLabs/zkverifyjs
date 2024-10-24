import { ProofOfSqlProof, ProofOfSqlVk, ProofOfSqlPubs } from '../types';

export function formatProof(proof: ProofOfSqlProof['proof']): string {
  return validateHexString(proof);
}

export function formatVk(vk: ProofOfSqlVk['vk']): string {
  return validateHexString(vk);
}

export function formatPubs(pubs: ProofOfSqlPubs['pubs']): string {
  return validateHexString(pubs);
}

function validateHexString(input: string): string {
  if (!input.startsWith('0x')) {
    throw new Error('Invalid format: string input must be 0x-prefixed.');
  }
  return input;
}

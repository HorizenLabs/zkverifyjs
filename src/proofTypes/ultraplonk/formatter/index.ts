import { UltraPlonkProof, UltraPlonkVk, UltraPlonkPubs } from '../types';

export function formatProof(proof: UltraPlonkProof['proof']): string {
  if (!proof.startsWith('0x')) {
    return `0x${proof}`;
  }
  return proof;
}

export function formatVk(vkInput: UltraPlonkVk['vk']): Uint8Array {
  if (!vkInput.startsWith('0x')) {
    vkInput = `0x${vkInput}`;
  }
  return Uint8Array.from(Buffer.from(vkInput.slice(2), 'hex'));
}

export function formatPubs(pubs: UltraPlonkPubs['pubs']): string[] {
  if (typeof pubs === 'string') {
    return [validateHexString(pubs)];
  } else if (Array.isArray(pubs)) {
    return pubs.map((pub) => {
      return validateHexString(pub);
    });
  } else {
    throw new Error(
      'Invalid input type: expected a string or an array of strings.',
    );
  }
}

function validateHexString(input: string): string {
  if (!input.startsWith('0x')) {
    throw new Error('string input must be 0x-prefixed.');
  }
  return input;
}

import { ProofProcessor } from '../../../types';
import { UltraPlonkProof, UltraPlonkVk, UltraPlonkPubs } from '../types';
import * as formatter from '../formatter';

class UltraPlonkProcessor implements ProofProcessor {
  formatProof(proof: UltraPlonkProof['proof']): string {
    return formatter.formatProof(proof);
  }

  formatVk(vk: UltraPlonkVk['vk']): Uint8Array {
    return formatter.formatVk(vk);
  }

  formatPubs(pubs: UltraPlonkPubs['pubs']): string[] {
    return formatter.formatPubs(pubs);
  }
}

export default new UltraPlonkProcessor();

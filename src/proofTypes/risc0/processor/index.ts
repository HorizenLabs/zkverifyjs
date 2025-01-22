import { ProofProcessor } from '../../../types';
import { Risc0Proof, Risc0Vk, Risc0Pubs } from '../types';
import * as formatter from '../formatter';

class Risc0Processor implements ProofProcessor {
  formatProof(proofData: Risc0Proof): Record<string, string> {
    const { proof, version } = proofData;
    const formattedProof = formatter.formatProof(proof);

    return { [version]: formattedProof };
  }

  formatVk(vk: Risc0Vk['vk']): string {
    return formatter.formatVk(vk);
  }

  formatPubs(pubs: Risc0Pubs['pubs']): string {
    return formatter.formatPubs(pubs);
  }
}

export default new Risc0Processor();

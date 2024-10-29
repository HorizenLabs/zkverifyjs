import { ProofProcessor } from '../../../types';
import { ProofOfSqlProof, ProofOfSqlVk, ProofOfSqlPubs } from '../types';
import * as formatter from '../formatter';

class ProofOfSqlProcessor implements ProofProcessor {
  formatProof(proof: ProofOfSqlProof['proof']): string {
    return formatter.formatProof(proof);
  }

  formatVk(vk: ProofOfSqlVk['vk']): string {
    return formatter.formatVk(vk);
  }

  formatPubs(pubs: ProofOfSqlPubs['pubs']): string {
    return formatter.formatPubs(pubs);
  }
}

export default new ProofOfSqlProcessor();

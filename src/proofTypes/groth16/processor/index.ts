import { Proof, ProofInner } from "../../../types";
import * as formatter from '../formatter';
import { ProofProcessor } from "../../../types";

class Groth16Processor implements ProofProcessor {
    formatProof(proof: any, publicSignals: string[]): Proof<ProofInner> {
        return formatter.formatProof(proof);
    }

    formatVk(vkJson: any): any {
        return formatter.formatVk(vkJson);
    }

    formatPubs(pubs: string[]): string[] {
        return formatter.formatPubs(pubs);
    }
}

export default new Groth16Processor();

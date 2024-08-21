import { Groth16VerificationKey, Groth16VerificationKeyInput, Proof, ProofInput } from "../types";
import * as formatter from '../formatter';
import { ProofProcessor } from "../../../types";

class Groth16Processor implements ProofProcessor {
    formatProof(proof: ProofInput): Proof {
        return formatter.formatProof(proof);
    }

    formatVk(vk: Groth16VerificationKeyInput): Groth16VerificationKey {
        return formatter.formatVk(vk);
    }

    formatPubs(pubs: string[]): string[] {
        return formatter.formatPubs(pubs);
    }
}

export default new Groth16Processor();

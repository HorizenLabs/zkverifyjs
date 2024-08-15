import { Proof, ProofInner } from "../../../types";
import {
    formatProof as formatGroth16Proof,
    formatPubs as formatGroth16Pubs,
    formatVk as formatGroth16Vk
} from "../formatter";
import { ProofProcessor } from "../../../types";

class Groth16Processor implements ProofProcessor {
    formatProof(proof: any, publicSignals: string[]): Proof<ProofInner> {
        return formatGroth16Proof(proof);
    }

    formatVk(vkJson: any): any {
        return formatGroth16Vk(vkJson);
    }

    formatPubs(pubs: string[]): string[] {
        return formatGroth16Pubs(pubs);
    }

    processProofData(proofData: { proof: any, vk: any, publicSignals: string[] }): {
        formattedProof: Proof<ProofInner>,
        formattedVk: any,
        formattedPubs: string[]
    } {
        return {
            formattedProof: this.formatProof(proofData.proof, proofData.publicSignals),
            formattedVk: this.formatVk(proofData.vk),
            formattedPubs: this.formatPubs(proofData.publicSignals)
        };
    }
}

export default new Groth16Processor();

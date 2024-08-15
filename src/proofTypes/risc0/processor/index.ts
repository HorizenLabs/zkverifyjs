import { ProofProcessor } from "../../../types";

class Risc0Processor implements ProofProcessor {
    formatProof(proof: any): string {
        return JSON.stringify(proof);
    }

    formatVk(vkJson: any): any {
        return vkJson;
    }

    formatPubs(pubs: any[]): string {
        return JSON.stringify(pubs);
    }

    processProofData(...rawData: any[]): { formattedProof: any; formattedVk: any; formattedPubs: any } {
        // TODO
        return {formattedProof: undefined, formattedPubs: undefined, formattedVk: undefined};
    }
}

export default new Risc0Processor();

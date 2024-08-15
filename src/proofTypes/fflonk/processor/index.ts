import { FflonkVerificationKey, FflonkProof, FflonkPublicSignals } from "../types";
import { formatProof as formatFflonkProof, formatPubs as formatFflonkPubs, formatVk as formatFflonkVk } from "../formatter";
import { ProofProcessor } from "../../../types";

class FflonkProcessor implements ProofProcessor {
    formatProof(proof: FflonkProof): string {
        return formatFflonkProof(proof);
    }

    formatVk(vkJson: FflonkVerificationKey): FflonkVerificationKey {
        return formatFflonkVk(vkJson);
    }

    formatPubs(pubs: FflonkPublicSignals): string {
        return formatFflonkPubs(pubs);
    }

    processProofData(proof: FflonkProof, publicSignals: FflonkPublicSignals, vk: FflonkVerificationKey): {
        formattedProof: string,
        formattedVk: FflonkVerificationKey,
        formattedPubs: string
    } {
        return {
            formattedProof: this.formatProof(proof),
            formattedVk: this.formatVk(vk),
            formattedPubs: this.formatPubs(publicSignals),
        };
    }
}

export default new FflonkProcessor();

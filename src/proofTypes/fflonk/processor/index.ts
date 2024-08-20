import { FflonkProof, FflonkPublicSignals, FflonkVerificationKey } from "../types";
import {
    formatProof as formatFflonkProof,
    formatPubs as formatFflonkPubs,
    formatVk as formatFflonkVk
} from "../formatter";
import { ProofProcessor } from "../../../types";

class FflonkProcessor implements ProofProcessor {
    formatProof(proof: FflonkProof): string {
        return formatFflonkProof(proof);
    }

    formatVk(vk: FflonkVerificationKey): FflonkVerificationKey {
        return formatFflonkVk(vk);
    }

    formatPubs(pubs: FflonkPublicSignals): string {
        return formatFflonkPubs(pubs);
    }
}

export default new FflonkProcessor();

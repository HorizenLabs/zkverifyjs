import { SupportedNetwork } from "../config";

export interface zkVerifySessionOptions {
    host: SupportedNetwork;
    seedPhrase?: string;
    customWsUrl?: string;
}

export interface VerifyOptions {
    proofType: string;
    nonce?: number;
    waitForNewAttestationEvent?: boolean;
}
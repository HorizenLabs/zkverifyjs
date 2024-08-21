import { SupportedNetwork } from "../config";

export interface zkVerifySessionOptions {
    host: SupportedNetwork;
    seedPhrase?: string;
    customWsUrl?: string;
}

export interface VerifyOptions {
    proofType: string;
    registeredVk?: string;
    nonce?: number;
    waitForNewAttestationEvent?: boolean;
}
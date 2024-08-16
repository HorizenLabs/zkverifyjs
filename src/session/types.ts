import { SupportedNetwork } from "../config";

export interface zkVerifySessionOptions {
    host: SupportedNetwork;
    seedPhrase?: string;
    customWsUrl?: string;
}
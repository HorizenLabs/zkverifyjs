import { SupportedNetwork } from '../config';

export interface zkVerifySessionOptions {
  host: SupportedNetwork;
  seedPhrase?: string;
  customWsUrl?: string;
}

export interface VerifyOptions {
  proofType: string;
  registeredVk?: boolean;
  nonce?: number;
  waitForNewAttestationEvent?: boolean;
}

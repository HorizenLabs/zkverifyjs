import { ProofType, SupportedNetwork } from '../config';

export interface zkVerifySessionOptions {
  host: SupportedNetwork;
  seedPhrase?: string;
  customWsUrl?: string;
  wallet?: boolean;
}

export interface VerifyOptions {
  proofType: ProofType;
  registeredVk?: boolean;
  nonce?: number;
  waitForNewAttestationEvent?: boolean;
}

import { CurveType, Library, ProofType, SupportedNetwork } from '../config';

export interface zkVerifySessionOptions {
  host: SupportedNetwork;
  seedPhrase?: string;
  customWsUrl?: string;
  wallet?: WalletOptions;
}

export interface WalletOptions {
  source: string;
  accountAddress: string;
}

export interface VerifyOptions {
  proofOptions: ProofOptions;
  nonce?: number;
  waitForNewAttestationEvent?: boolean;
  registeredVk?: boolean;
}

export interface ProofOptions {
  proofType: ProofType;
  library?: Library;
  curve?: CurveType;
}

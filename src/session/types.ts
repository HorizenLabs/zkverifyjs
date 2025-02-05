import { CurveType, Library, ProofType, SupportedNetwork } from '../config';
import { VerificationManager } from './managers/verification';
import { VerificationKeyRegistrationManager } from './managers/register';
import { FormatManager } from './managers/format';
import { PoEManager } from './managers/poe';
import { EventManager } from './managers/events';
import { ExtrinsicManager } from './managers/extrinsic';
import { ConnectionManager } from './managers/connection';

export interface SessionMethods {
  verify: VerificationManager['verify'];
  optimisticVerify: VerificationManager['optimisticVerify'];
  registerVerificationKey: VerificationKeyRegistrationManager['registerVerificationKey'];
  format: FormatManager['format'];
  poe: PoEManager['poe'];
  subscribeToNewAttestations: EventManager['subscribe'];
  unsubscribe: EventManager['unsubscribe'];
  createExtrinsicHex: ExtrinsicManager['createExtrinsicHex'];
  createSubmitProofExtrinsic: ExtrinsicManager['createSubmitProofExtrinsic'];
  createExtrinsicFromHex: ExtrinsicManager['createExtrinsicFromHex'];
  estimateCost: ExtrinsicManager['estimateCost'];
  close: ConnectionManager['close'];
  accountInfo: ConnectionManager['getAccountInfo'];
  addAccount: ConnectionManager['addAccount'];
  removeAccount: ConnectionManager['removeAccount'];
}

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

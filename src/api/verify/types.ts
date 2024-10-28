import { SubmittableExtrinsic } from '@polkadot/api/types';

export type VerifyInput =
  | { proofData?: unknown[]; extrinsic?: never }
  | { extrinsic?: SubmittableExtrinsic<'promise'>; proofData?: never };

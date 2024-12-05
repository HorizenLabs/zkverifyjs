import { ProofProcessor } from '../types';
import {
  FflonkProcessor,
  Groth16Processor,
  ProofOfSqlProcessor,
  Risc0Processor,
  UltraPlonkProcessor,
} from '../proofTypes';

export enum SupportedNetwork {
  Testnet = 'wss://testnet-rpc.zkverify.io',
  Custom = 'custom',
  // ADD_NEW_SUPPORTED_NETWORK
}

export enum ProofType {
  fflonk = 'fflonk',
  groth16 = 'groth16',
  risc0 = 'risc0',
  ultraplonk = 'ultraplonk',
  proofofsql = 'proofofsql',
  // ADD_NEW_PROOF_TYPE
}

export enum Library {
  snarkjs = 'snarkjs',
  gnark = 'gnark',
}

export enum CurveType {
  bn128 = 'bn128',
  bn254 = 'bn254',
  bls12381 = 'bls12381',
}

interface ProofConfig {
  pallet: string;
  processor: ProofProcessor;
  requiresLibrary?: boolean;
  requiresCurve?: boolean;
}

export const proofConfigurations: Record<ProofType, ProofConfig> = {
  [ProofType.fflonk]: {
    pallet: 'settlementFFlonkPallet',
    processor: FflonkProcessor,
    requiresLibrary: false,
    requiresCurve: false,
  },
  [ProofType.groth16]: {
    pallet: 'settlementGroth16Pallet',
    processor: Groth16Processor,
    requiresLibrary: true,
    requiresCurve: true,
  },
  [ProofType.risc0]: {
    pallet: 'settlementRisc0Pallet',
    processor: Risc0Processor,
    requiresLibrary: false,
    requiresCurve: false,
  },
  [ProofType.ultraplonk]: {
    pallet: 'settlementUltraplonkPallet',
    processor: UltraPlonkProcessor,
    requiresLibrary: false,
    requiresCurve: false,
  },
  [ProofType.proofofsql]: {
    pallet: 'settlementProofOfSqlPallet',
    processor: ProofOfSqlProcessor,
    requiresLibrary: false,
    requiresCurve: false,
  },
};

export const zkvTypes = {
  MerkleProof: {
    root: 'H256',
    proof: 'Vec<H256>',
    number_of_leaves: 'u32',
    leaf_index: 'u32',
    leaf: 'H256',
  },
};

export const zkvRpc = {
  poe: {
    proofPath: {
      description: 'Get the Merkle root and path of a stored proof',
      params: [
        {
          name: 'attestation_id',
          type: 'u64',
        },
        {
          name: 'proof_hash',
          type: 'H256',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'MerkleProof',
    },
  },
};

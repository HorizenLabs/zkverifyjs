import { ProofProcessor } from '../types';
import {
  FflonkProcessor,
  Groth16Processor,
  Risc0Processor,
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
  // ADD_NEW_PROOF_TYPE
}

interface ProofConfig {
  pallet: string;
  processor: ProofProcessor;
}

export const proofConfigurations: Record<ProofType, ProofConfig> = {
  [ProofType.fflonk]: {
    pallet: 'settlementFFlonkPallet',
    processor: FflonkProcessor,
  },
  [ProofType.groth16]: {
    pallet: 'settlementGroth16Pallet',
    processor: Groth16Processor,
  },
  [ProofType.risc0]: {
    pallet: 'settlementRisc0Pallet',
    processor: Risc0Processor,
  },
  // ADD_NEW_PROOF_TYPE
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

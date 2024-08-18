export const supportedNetworks = ['testnet', 'custom'] as const;

export type SupportedNetwork = typeof supportedNetworks[number];

export const defaultUrls: Record<Exclude<SupportedNetwork, 'custom'>, string> = {
    testnet: 'wss://testnet-rpc.zkverify.io',
    // TODO: Add mainnet...
};

export const proofTypeToPallet: Record<string, string> = {
    groth16: "settlementGroth16Pallet",
    fflonk: "settlementFFlonkPallet",
    zksync: "settlementZksyncPallet",
    risc0: "settlementRisc0Pallet",
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

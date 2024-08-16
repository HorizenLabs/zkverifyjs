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

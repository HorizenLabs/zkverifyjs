export interface Groth16VerificationKeyInput {
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
}

export interface Groth16VerificationKey {
  curve: string;
  alpha_g1: string;
  beta_g2: string;
  gamma_g2: string;
  delta_g2: string;
  gamma_abc_g1: string[];
}

export interface ProofInput {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

export interface ProofInner {
  a: string;
  b: string;
  c: string;
}

export interface Proof {
  curve?: string;
  proof: ProofInner;
}

import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AccountConnection } from '../connection/types';
import { ExtrinsicCostEstimate } from './types';

/**
 * Converts a fee in the smallest unit to the base token unit.
 *
 * @param {string} feeInSmallestUnit - Fee in the blockchain's smallest unit.
 * @param {number} decimals - The number of decimals in the blockchain's base token.
 * @returns {string} - The fee in the base token unit.
 */
export function convertFeeToToken(
  feeInSmallestUnit: string,
  decimals: number,
): string {
  const feeInTokens = parseFloat(feeInSmallestUnit) / Math.pow(10, decimals);
  return feeInTokens.toFixed(decimals);
}

/**
 * Estimates the cost of a given extrinsic for the specified user.
 *
 * @param {ApiPromise} api - The Polkadot API instance.
 * @param {SubmittableExtrinsic<'promise', ISubmittableResult>} extrinsic - The extrinsic to estimate.
 * @param {AccountConnection} connection - The user's account connection, containing account information.
 * @returns {Promise<ExtrinsicCostEstimate>} - A promise that resolves to an object containing the estimated fee and extrinsic details.
 */
export async function estimateCost(
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise'>,
  connection: AccountConnection,
): Promise<ExtrinsicCostEstimate> {
  if (!connection.account) {
    throw new Error(
      'Account information is required to estimate extrinsic cost.',
    );
  }

  const paymentInfo = await extrinsic.paymentInfo(connection.account);
  const tokenDecimals = api.registry.chainDecimals[0];
  const estimatedFeeInTokens = convertFeeToToken(
    paymentInfo.partialFee.toString(),
    tokenDecimals,
  );

  return {
    partialFee: paymentInfo.partialFee.toString(),
    estimatedFeeInTokens,
    weight: paymentInfo.weight.toString(),
    length: extrinsic.length,
  };
}

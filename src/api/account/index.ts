import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountInfo } from '../../types';

export async function accountInfo(
  api: ApiPromise,
  account: KeyringPair,
): Promise<AccountInfo> {
  const {
    data: { free, reserved },
    nonce,
  } = await api.query.system.account(account.address);

  return {
    address: account.address,
    nonce: nonce.toNumber(),
    freeBalance: free.toString(),
    reservedBalance: reserved.toString(),
  };
}

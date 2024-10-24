import { cryptoWaitReady } from '@polkadot/util-crypto';
import { setupAccount } from './index';
import { getSeedPhrase } from '../../../tests/common/utils';

describe('setupAccount', () => {
  beforeAll(async () => {
    await cryptoWaitReady();
  });

  it('should return a KeyringPair when provided with a valid seed phrase', () => {
    const account = setupAccount(getSeedPhrase(0));

    expect(account).toBeDefined();
    expect(account.publicKey).toBeDefined();
  });

  it('should throw an error with a custom message when an invalid seed phrase is provided', () => {
    const invalidSeedPhrase = 'invalid-seed-phrase';

    expect(() => setupAccount(invalidSeedPhrase)).toThrowError(
      /Invalid seed phrase provided:/,
    );
  });
});

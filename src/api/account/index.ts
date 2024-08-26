import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

/**
 * Sets up the account using the provided secret seed phrase.
 *
 * @param {string} secretSeedPhrase - The secret seed phrase used to create the account.
 * @returns {KeyringPair} The initialized account.
 * @throws Will throw an error if the seed phrase is invalid.
 */
export const setupAccount = (secretSeedPhrase: string): KeyringPair => {
  try {
    const keyring = new Keyring({ type: 'sr25519' });
    return keyring.addFromUri(secretSeedPhrase);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid seed phrase provided: ${error.message}`);
    } else {
      throw new Error(
        'An unknown error occurred while setting up the account.',
      );
    }
  }
};

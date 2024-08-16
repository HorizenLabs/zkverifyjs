# zkverifyjs Instructions

The `zkverifyjs` package is a TypeScript library designed to facilitate sending proofs to zkVerify for verification, listening for transaction events, and waiting for transaction finalization. The package is built with an intuitive API that allows developers to handle real-time transaction events and await final results.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
    - [Creating a Session](#creating-a-session)
    - [Verifying a Proof](#verifying-a-proof)
    - [Listening to Events](#listening-to-events)
    - [Awaiting the Final Transaction Result](#awaiting-the-final-transaction-result)
    - [Example Usage](#example-usage)
- [API Reference](#api-reference)
    - [zkVerifySession.start](#zkverifysessionstart)
    - [zkVerifySession.verify](#zkverifysessionverify)
    - [zkVerifySession.verifyAndWaitForAttestationEvent](#zkverifysessionverifyandwaitforattestationevent)
- [Testing](#testing)

## Installation

To install the package, use npm or yarn:

```bash
npm install zkverifyjs
```

## Usage

### Creating a Session

Before sending a proof, you need to start a session. A session establishes a connection to the zkVerify network and optionally sets up an account using a seed phrase (required for sending transactions).

1. Read-Only Session with Supported Network:
```typescript
const session = await zkVerifySession.start({ host: 'testnet' });
```
2. Read-Only Session with Custom WebSocket:
```typescript
const session = await zkVerifySession.start({ host: 'custom', customWsUrl: 'wss://custom-url' });
```
3. Full Session (send transactions) with Supported Network:
```typescript
const session = await zkVerifySession.start({ host: 'testnet', seedPhrase: 'your-seed-phrase' });
```
4. Full Session (send transactions)  with Custom WebSocket:
```typescript
const session = await zkVerifySession.start({ host: 'custom', seedPhrase: 'your-seed-phrase', customWsUrl: 'wss://custom-url' });
```

- `host`: The pre-configured network to connect to (e.g., testnet). Use `custom` to use your own websocket url alongside the `customWsUrl` option.
- `seedPhrase`: (Optional) The seed phrase for the account that will send the transaction.
- `customWsUrl`: (Optional) Must be provided if `host='custom'`.

Not providing a seed phrase will start a read-only session, transaction methods cannot be used, and only calls to read data are allowed:

```typescript
import { zkVerifySession } from 'zkverifyjs';

const readOnlySession = await zkVerifySession.start('testnet');
```

### Verifying a Proof

To verify a proof, use the `verify` method. This method returns an object containing an EventEmitter for handling real-time events and a Promise for awaiting the transaction's final result.

```typescript
const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);
```

### Listening to Events

You can listen for transaction events using the events emitter. Common events include:

- `includedInBlock`: Triggered when the transaction is included in a block.
- `finalized`: Triggered when the transaction is finalized.
- `attestationConfirmed`: Triggered when the NewElement event is raised by the zkVerify chain.
- `error`: Triggered if an error occurs during the transaction process.

```typescript
const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);

events.on('includedInBlock', (eventData) => {
    console.log('Transaction included in block:', eventData);
});

events.on('finalized', (eventData) => {
    console.log('Transaction finalized:', eventData);
});

events.on('attestationConfirmed', (eventData) => {
    console.log('Attestation Event Raised:', eventData);
});

events.on('error', (error) => {
    console.error('An error occurred during the transaction:', error);
});
```

### Awaiting the Final Transaction Result

To await the final result of the transaction, use the transactionResult promise. This resolves with the final transaction details after the transaction is finalized in a block.

```typescript
const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);
const result = await transactionResult;
console.log('Final transaction result:', result);
```

### Example Usage

```typescript
import { zkVerifySession } from 'zkverify-session';

async function executeTransaction() {
    const session = await zkVerifySession.start('testnet', 'your-seed-phrase');

    const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);

    events.on('includedInBlock', (eventData) => {
        console.log('Transaction included in block:', eventData);
    });

    events.on('finalized', (eventData) => {
        console.log('Transaction finalized:', eventData);
    });

    events.on('error', (error) => {
        console.error('An error occurred during the transaction:', error);
    });

    try {
        const result = await transactionResult;
        console.log('Transaction completed successfully:', result);
    } catch (error) {
        console.error('Transaction failed:', error);
    }

    await session.close();
}

executeTransaction();
```

### API Reference

### `zkVerifySession.start`

```typescript
const session = await zkVerifySession.start({ host, seedPhrase?, customWsUrl? });
```

- `host`: The network to connect to (e.g., testnet).
- `seedPhrase`: (Optional) The seed phrase for the account.
- `customWsUrl`: (Optional) A custom WebSocket URL for connecting to the blockchain.

### `zkVerifySession.close`

```typescript
await session.close();
```
Closes the zkVerifySession.

### `zkVerifySession.accountInfo`

```typescript
const accountInfo: AccountInfo = await session.accountInfo();
console.log(accountInfo.address);
console.log(accountInfo.nonce);
console.log(accountInfo.freeBalance);
console.log(accountInfo.reservedBalance);
```
Returns account information: address, nonce, freeBalance and reservedBalance. Full session only, will not work in readOnly mode.

### `zkVerifySession.verify`

```typescript
const { events, transactionResult } = await session.verify('fflonk', proof, publicSignals, vk);
```

- `proofType`: The type of proof being sent.
- `proofData`: The data required for the proof - this is different for every proof type, accepted as `...proofData`.
- Returns: An object containing an EventEmitter for real-time events and a Promise that resolves with the final transaction result.

### `zkVerifySession.verifyAndWaitForAttestationEvent`

```typescript
const { events, transactionResult } = await session.verifyAndWaitForAttestationEvent('fflonk', proof, publicSignals, vk);
```

- `proofType`: The type of proof being sent.
- `proofData`: The data required for the proof.
- Returns: An object containing an EventEmitter for real-time events and a Promise that resolves with the final transaction result, including waiting for the `poe.NewElement` attestation confirmation.

### Testing

To run the tests, use the following command:

```shell
npm test
```
# zkVerifyJS Setup

## Pre-Requisities

1. Node 18+

```shell
ls-engines // Get minimum node version required for project based on dependencies.
```

```shell
ls-engines --save// Get minimum node version required for project based on dependencies and SAVE it to the package.json.
```

2. `SEED_PHRASE="your seed phrase..."` entered into a `.env` file with your own seed phrase.

```dotenv
SEED_PHRASE="MY SEED PHRASE WORDS GO HERE"
```

## Fresh Install

1. Build & install zkverifyjs pack, install dependencies

```shell
npm install && npm run pack-and-install
```

## Install Package Locally

1. Deploy the package with latest code

```shell
npm run pack-and-install
```

## Add New Proof Types

1. Update `src/config/index.ts`
2. Add a new proof to src/proofTypes including processor and formatter, and add export to `src/proofTypes/index.ts`

- Search for `ADD_NEW_PROOF_TYPE` in the codebase.

## Add New Supported Network

If we want to add a new configured network (e.g. mainnet)

1. Update `src/config/index.ts`

- Search for `ADD_NEW_SUPPORTED_NETWORK` in the codebase.

## Run Tests

- Run a specific test
```shell
npx jest tests/verify.fflonk.test.ts  
```

- Run all tests
```shell
npm run test
```

## Test Coverage

- Run coverage for a specific file
```shell
npm run test:file:coverage src/api/connection  
```

- Run coverage for entire project
```shell
npm run test:coverage
```
# About

`@ledgerhq/ledger-wagmi-connector` is a connector for the popular
[wagmi](https://github.com/wagmi-dev/wagmi) library based on the Ledger Connect Kit,
[@ledgerhq/connect-kit](https://github.com/ledgerhq/connect-kit).

This connector can be used to add a Ledger button to your DApp. Have a look at
the [Ledger developer portal](https://developers.ledger.com/docs/connect/introduction/)
for more information on Connect Kit and the Ledger button.

## How to use

Here is an example of a wagmi client using the Ledger wagmi connector.

```ts
import { configureChains, defaultChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { LedgerConnector } from '@ledgerhq/ledger-wagmi-connector';

const { chains } = configureChains(defaultChains, [
  publicProvider()
]);

export const connectors = {
  ledger: new LedgerConnector({
    chains,
    options: {
      enableDebugLogs: false,
      // passed to WalletConnect
      chainId: 1,
      // specify if no rpc, passed to WalletConnect
      infuraId: 'YOUR_INFURA_ID',
      // specify chain:URL if no infuraId, passed to WalletConnect
      rpc: {
        1: 'https://cloudflare-eth.com/', // Mainnet
        137: 'https://polygon-rpc.com/',  // Polygon
      }
    }
  }),
};
```

# Contributing

**You need to have a recent [Node.js](https://nodejs.org/) and
[yarn](https://yarnpkg.com) installed.**

## Install dependencies

```bash
yarn install
```

## Build

Build the Connector

```bash
yarn build
```

## Lint

Check code quality with

```bash
yarn lint
```

# Documentation

Have a look at [the wagmi repo](https://github.com/wagmi-dev/wagmi) and [the wagmi doc](https://wagmi.sh/) to learn more on connectors and wagmi.

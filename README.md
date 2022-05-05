# hardhat-swapper-util-ts

## Installation

1. `npm install --save-dev @jgensler8_2/hardhat-swapper-util-ts
2. `npx hardhat run install-deps`
3. update your hardhat config:

```
// file: hardhat.config.js

// 3.1 import 
const swapper_utils = require('@jgensler8_2/hardhat-swapper-utils-ts');

{
// 3.2: uniswap depends on older version of compilers, use ones exposed by this package
  solidity: {
    compilers: [
      ...swapper_utils.compilers
    ],
  },
// 3.3: recompiling uniswap leads to larger bytecode
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    }
  },
}
```

4. Access Swapper utils via HRE:

```
// file: your-script.js

const hre = require("hardhat");

async function main() {
    let su = hre.su
    let state = su.defaultState()
    state = await su.autoDeployUniswapV2Factory(state)
    state = await su.autoDeployTokens(state)
    state = await su.autoDeployUniswapV2Pairs(state)
    state = await su.autoDeployUniswapV2Router(state)
    state = await su.autoDripAndInitializePools(state)

    const amountAIn = 10000
    const tokenA = state.tokens["TOKA"]
    const tokenB = state.tokens["TOKB"]
    let amounts = await state.uniswapV2Router02.getAmountsOut(amountAIn, [tokenA.address, tokenB.address])

    console.log(`amounts: ${amounts}`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
```

```
npx hardhat run your-script.js
```

## Testing

Running `npm run test` will run every test located in the `test/` folder. They
use [mocha](https://mochajs.org) and [chai](https://www.chaijs.com/),
but you can customize them.

## Linting and autoformat

All of Hardhat projects use [prettier](https://prettier.io/) and
[tslint](https://palantir.github.io/tslint/).

You can check if your code style is correct by running `npm run lint`, and fix
it with `npm run lint:fix`.

## Building the project

Just run `npm run build` ️👷


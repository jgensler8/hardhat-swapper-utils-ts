# hardhat-swapper-util-ts

recompiles various UniswapV2 contracts.

Note: this differs from the existing [hardhat-plugin-deploy-v3](https://github.com/Uniswap/hardhat-plugin-deploy-v3) in that it completely recompiles the Uniswap V2 contracts. As the Uniswap periphery library [depends on a hash of the V2Pair contract](https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol#L24), I have also build a package to compensate for the hardcoded hash ([link](https://github.com/jgensler8/v2-periphery-util)).

## Installation

1. Install: `npm install --save-dev @jgensler8_2/hardhat-swapper-util-ts` .
  * Note: this has several common peer dependencies and might cause errors if you already have those as devDependencies.
2. Install contract dependencies: `npx hardhat install-deps` .
  * Note: rather than [overriding hardhats internal build chain](https://github.com/NomicFoundation/hardhat/blob/master/packages/hardhat-core/src/builtin-tasks/compile.ts), hardhad-swapper-utils-ts installs contracts to allow native `import` to build the correct dependency tree.
3. Update your hardhat config:

```javascript
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

```javascript
// file: your-script.js

const hre = require("hardhat");

async function main() {
    let su = hre.su
    let state = su.defaultState()
    // deploy all at once
    state = await su.autoDeployAll(state)
    /*
    // or deploy manually
    state = await su.autoDeployTokens(state)
    state = await su.autoDeployUniswapV2Factory(state)
    state = await su.autoDeployUniswapV2Pairs(state)
    state = await su.autoDeployUniswapV2Router(state)
    state = await su.autoDripAndInitializePools(state)
    */

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

5. Finally, run your script:

```
$ npx hardhat run your-script.js
amounts: 10000,906
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

Just run `npm run build` ???????


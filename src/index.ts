import { copyFileSync } from "fs";
import { mkdirp } from "fs-extra";
import { extendConfig, extendEnvironment, subtask, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import path from "path";

import { EthersHardhatRuntimeEnvironment, SwapperUtils } from "./SwapperUtils";
// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    // We apply our default config here. Any other kind of config resolution
    // or normalization should be placed here.
    //
    // `config` is the resolved config, which will be used during runtime and
    // you should modify.
    // `userConfig` is the config as provided by the user. You should not modify
    // it.
    //
    // If you extended the `HardhatConfig` type, you need to make sure that
    // executing this function ensures that the `config` object is in a valid
    // state for its type, including its extensions. For example, you may
    // need to apply a default value, like in this example.
    const userPath = userConfig.paths?.newPath;

    let newPath: string;
    if (userPath === undefined) {
      newPath = path.join(config.paths.root, "newPath");
    } else {
      if (path.isAbsolute(userPath)) {
        newPath = userPath;
      } else {
        // We resolve relative paths starting from the project's root.
        // Please keep this convention to avoid confusion.
        newPath = path.normalize(path.join(config.paths.root, userPath));
      }
    }

    config.paths.newPath = newPath;
  }
);

extendEnvironment((hre) => {
  // We add a field to the Hardhat Runtime Environment here.
  // We use lazyObject to avoid initializing things until they are actually
  // needed.
  // hre.su = lazyObject(() => new SwapperUtils((hre as EthersHardhatRuntimeEnvironment), {faucetToken: "FaucetToken"}));
  hre.su = new SwapperUtils(
    hre as EthersHardhatRuntimeEnvironment,
    SwapperUtils.defaultState().names
  );
});

export const contracts = [
  "FaucetToken.sol",
  "UniswapImports_0_5_16.sol",
  "UniswapImports_0_6_6.sol",
];

task(
  "install-deps",
  "install 'import' contracts to allow hardhat to find and build Uniswap V2 and OpenZeppelin contracts"
)
  .addParam(
    "sourcePathRelativeModifier",
    "relative source directory is {root}/dist/src in prod and {root}/src in test. defaults to prod relative path.",
    "../.."
  )
  .setAction(async function (args, hre) {
    const destDir = `${hre.config.paths.sources}/deps/@jgensler8_2/hardhat-swapper-utils-ts/`;
    await mkdirp(destDir);
    for (const contract of contracts) {
      copyFileSync(
        `${__dirname}/${args.sourcePathRelativeModifier}/contracts/${contract}`,
        `${destDir}/${contract}`
      );
    }
    // TODO: also add a .gitignore
  });

export const compilers = [
  {
    version: "0.8.4",
  },
  {
    version: "0.6.6",
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
  {
    version: "0.5.16",
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
];

export const defaultState = SwapperUtils.defaultState;

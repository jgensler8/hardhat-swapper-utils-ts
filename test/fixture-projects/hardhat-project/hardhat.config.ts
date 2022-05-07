// We load the plugin here.
import { HardhatUserConfig } from "hardhat/types";

import { compilers } from "../../../src/index";

require("@nomiclabs/hardhat-ethers");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [...compilers],
  },
  defaultNetwork: "hardhat",
  paths: {
    newPath: "asd",
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
};

export default config;

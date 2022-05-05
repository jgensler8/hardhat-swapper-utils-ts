import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatEthersHelpers } from '@nomiclabs/hardhat-ethers/types';

export type Names = {
  faucetToken: string
}

export type Tokens = {
  [key: string]: any
}

export type State = {
  names: Names,
  tokenSymbolList: Array<string>,
  tokens: Tokens,
}

export interface EthersHardhatRuntimeEnvironment extends HardhatRuntimeEnvironment {
  ethers: HardhatEthersHelpers
}

export class SwapperUtils {
  private hre: EthersHardhatRuntimeEnvironment;
  private names: Names;

  constructor(hre: EthersHardhatRuntimeEnvironment, names: Names) {
    this.hre = hre;
    this.names = names;
  }

  public sayHello() {
    return "hello";
  }
  
  public defaultState() {
    return {
        // contract names
        names: {
            uniswapV2Factory: "UniswapV2Factory",
            faucetToken: "FaucetToken",
            uniswapV2Pair: "UniswapV2Pair",
            uniswapV2Router02: "UniswapV2Router02",
        },
        tokenSymbolList: [
            "WETH",
            "TOKA",
            "TOKB"
        ],
    }
  }

  public async deployTokens(tokenSymbolList: Array<string>): Promise<Tokens> {
    const FakeTokenFactory = await this.hre.ethers.getContractFactory(this.names.faucetToken)
    let tokens: Tokens = {}
    for (let tokenSymbol of tokenSymbolList) {
        let token = await FakeTokenFactory.deploy(tokenSymbol)
        await token.deployed()
        tokens[tokenSymbol] = token
    }
    return tokens
  }

  public async autoDeployTokens(state: State): Promise<State> {
    state.tokens = await this.deployTokens(state.tokenSymbolList)
    return state
  }

}

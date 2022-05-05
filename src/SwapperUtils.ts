import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatEthersHelpers } from '@nomiclabs/hardhat-ethers/types';
import { ethers } from "ethers";

export type Names = {
  uniswapV2Factory: string
  faucetToken: string
  uniswapV2Pair: string
  uniswapV2Router02: string
}

export type Tokens = {
  [key: string]: any
}

export type Pairs = {
  [key: string]: any
}

export type State = {
  // accounts
  factoryFeeOwnerAccount?: any,
  poolInitializeAccount?: any,
  // tokens
  tokenSymbolList: string[],
  tokens: Tokens,
  pairs: Pairs,
  // contracts
  names: Names,
  uniswapV2Factory?: any,
  uniswapV2Router02?: any,
}

export interface ExtendedHardhatEthersHelper extends HardhatEthersHelpers {
  constants: any
  utils: any
}

export interface EthersHardhatRuntimeEnvironment extends HardhatRuntimeEnvironment {
  ethers: ExtendedHardhatEthersHelper
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

  public static defaultState(): State {
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
      tokens: {},
      pairs: {},
    }
  }


  public async deployUniswapV2Factory(uniswapFactoryFeeOwnerAccount: any) {
    const UniswapV2FactoryFactory = await this.hre.ethers.getContractFactory(this.names.uniswapV2Factory);
    const uniswapV2Factory = await UniswapV2FactoryFactory.deploy(uniswapFactoryFeeOwnerAccount.address);
    await uniswapV2Factory.deployed();
    return uniswapV2Factory
  }

  public async autoDeployUniswapV2Factory(state: State) {
    if (state.factoryFeeOwnerAccount === undefined) {
      let accounts = await this.hre.ethers.getSigners();
      state.factoryFeeOwnerAccount = accounts[0];
    }
    state.uniswapV2Factory = await this.deployUniswapV2Factory(state.factoryFeeOwnerAccount)
    return state
  }

  public async createUniswapV2Pair(uniswapV2Factory: any, tokenA: any, tokenB: any) {
    // technically, can use initial addLiquidity to create pair given check is done in that function
    // await uniswapV2Factory.createPair(tokenA.address, tokenB.address)

    // get pair address from event
    const createPairResponse = await uniswapV2Factory.createPair(tokenA.address, tokenB.address)
    const createPairResponseWaited = await createPairResponse.wait()
    const pairAddress = createPairResponseWaited.events[0].args[2]

    // let getPairResponse = await uniswapV2Factory.getPair(tokenA.address, tokenB.address)
    // console.log(getPairResponse)

    const pair = await this.hre.ethers.getContractAt(this.names.uniswapV2Pair, pairAddress)
    return pair
  }

  public async autoDeployUniswapV2Pairs(state: State) {
    let pairs: Pairs = {}
    for (let tokenAIndex = 0; tokenAIndex < state.tokenSymbolList.length; tokenAIndex++) {
      let tokenASymbol = state.tokenSymbolList[tokenAIndex]
      let tokenA = state.tokens[tokenASymbol]
      pairs[tokenASymbol] = {}
      for (let tokenBIndex = tokenAIndex + 1; tokenBIndex < state.tokenSymbolList.length; tokenBIndex++) {
        let tokenBSymbol = state.tokenSymbolList[tokenBIndex]
        let tokenB = state.tokens[tokenBSymbol]
        let pair = await this.createUniswapV2Pair(state.uniswapV2Factory, tokenA, tokenB)
        pairs[tokenASymbol][tokenBSymbol] = pair
      }
    }
    state.pairs = pairs
    return state
  }

  public async deployUniswapV2Router(uniswapV2FactoryAddress: any, wethAddress: any) {
    const UniswapV2Router02Factory = await this.hre.ethers.getContractFactory(this.names.uniswapV2Router02);
    const pairContract = await this.hre.ethers.getContractFactory(this.names.uniswapV2Pair)
    // https://ethereum.stackexchange.com/questions/114170/unit-testing-uniswapv2pair-function-call-to-a-non-contract-account#comment137427_114170
    const initCodeHash = this.hre.ethers.utils.keccak256(pairContract.bytecode)
    const uniswapV2Router02 = await UniswapV2Router02Factory.deploy(uniswapV2FactoryAddress, wethAddress, initCodeHash)
    await uniswapV2Router02.deployed()
    return uniswapV2Router02
  }

  public async autoDeployUniswapV2Router(state: State) {
    state.uniswapV2Router02 = await this.deployUniswapV2Router(state.uniswapV2Factory.address, state.tokens["WETH"].address)
    return state
  }

  public async dripAndInitializePools(initializeAccount: any, uniswapV2Router02: any, tokenA: any, tokenB: any) {
    // console.log("dripping tokens")
    await tokenA.drip(initializeAccount.address, 2000000)
    await tokenB.drip(initializeAccount.address, 1000000)
    await tokenA.connect(initializeAccount).approve(uniswapV2Router02.address, this.hre.ethers.constants.MaxUint256)
    await tokenB.connect(initializeAccount).approve(uniswapV2Router02.address, this.hre.ethers.constants.MaxUint256)

    // console.log("adding liquidity")
    const deadline = Math.floor(new Date().getTime() / 1000) + 60;
    await uniswapV2Router02.connect(initializeAccount).addLiquidity(tokenA.address, tokenB.address, 100000, 10000, 100000, 10000, initializeAccount.address, deadline)
  }

  public async autoDripAndInitializePools(state: State) {
    if (state.poolInitializeAccount === undefined) {
      const accounts = await this.hre.ethers.getSigners();
      state.poolInitializeAccount = accounts[1];
    }
    for (let tokenAIndex = 1; tokenAIndex < state.tokenSymbolList.length; tokenAIndex++) {
      let tokenASymbol = state.tokenSymbolList[tokenAIndex]
      let tokenA = state.tokens[tokenASymbol]
      for (let tokenBIndex = tokenAIndex + 1; tokenBIndex < state.tokenSymbolList.length; tokenBIndex++) {
        let tokenBSymbol = state.tokenSymbolList[tokenBIndex]
        let tokenB = state.tokens[tokenBSymbol]
        await this.dripAndInitializePools(state.poolInitializeAccount, state.uniswapV2Router02, tokenA, tokenB)
      }
    }
    return state
  }

  public async deployTokens(tokenSymbolList: string[]): Promise<Tokens> {
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

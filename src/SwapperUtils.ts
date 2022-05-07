import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export interface Names {
  uniswapV2Factory: string;
  faucetToken: string;
  uniswapV2Pair: string;
  uniswapV2Router02: string;
}

export interface Tokens {
  [key: string]: any;
}

export interface Pairs {
  [key: string]: any;
}

export interface PoolInitializer {
  midpointRatio: number;
  ratioDecimals: number;
  // set to 1 to not scale beyond the initial ratio*decimals
  ratioMultiplier: number;
}

export interface State {
  // accounts
  factoryFeeOwnerAccount?: any;
  poolInitializeAccount?: any;
  // tokens
  tokenSymbolList: string[];
  tokens: Tokens;
  pairs: Pairs;
  // contracts
  names: Names;
  uniswapV2Factory?: any;
  uniswapV2Router02?: any;
  uniswapDeadlineSeconds: number;
  poolInitializer: PoolInitializer;
}

export interface ExtendedHardhatEthersHelper extends HardhatEthersHelpers {
  constants: any;
  utils: any;
  BigNumber: any;
}

export interface EthersHardhatRuntimeEnvironment
  extends HardhatRuntimeEnvironment {
  ethers: ExtendedHardhatEthersHelper;
}

export interface TokenListItem {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
}

export interface TokenList {
  name: string
  tokens: TokenListItem[]
}

export class SwapperUtils {
  public static defaultState(): State {
    return {
      // contract names
      names: {
        uniswapV2Factory: "UniswapV2Factory",
        faucetToken: "FaucetToken",
        uniswapV2Pair: "UniswapV2Pair",
        uniswapV2Router02: "UniswapV2Router02",
      },
      tokenSymbolList: ["WETH", "TOKA", "TOKB"],
      tokens: {},
      pairs: {},
      uniswapDeadlineSeconds: 60,
      poolInitializer: {
        midpointRatio: 2.0,
        ratioDecimals: 22,
        ratioMultiplier: 1.0,
      },
    };
  }

  public static relativeDeadline(seconds: number) {
    return Math.floor(new Date().getTime() / 1000) + seconds;
  }
  private hre: EthersHardhatRuntimeEnvironment;
  private names: Names;

  constructor(hre: EthersHardhatRuntimeEnvironment, names: Names) {
    this.hre = hre;
    this.names = names;
  }

  public defaultState(): State {
    return SwapperUtils.defaultState();
  }

  public async deployUniswapV2Factory(uniswapFactoryFeeOwnerAccount: any) {
    const UniswapV2FactoryFactory = await this.hre.ethers.getContractFactory(
      this.names.uniswapV2Factory
    );
    const uniswapV2Factory = await UniswapV2FactoryFactory.deploy(
      uniswapFactoryFeeOwnerAccount.address
    );
    await uniswapV2Factory.deployed();
    return uniswapV2Factory;
  }

  public async autoDeployUniswapV2Factory(state: State) {
    if (state.factoryFeeOwnerAccount === undefined) {
      const accounts = await this.hre.ethers.getSigners();
      state.factoryFeeOwnerAccount = accounts[0];
    }
    state.uniswapV2Factory = await this.deployUniswapV2Factory(
      state.factoryFeeOwnerAccount
    );
    return state;
  }

  public async createUniswapV2Pair(
    uniswapV2Factory: any,
    tokenA: any,
    tokenB: any
  ) {
    // technically, can use initial addLiquidity to create pair given check is done in that function
    // await uniswapV2Factory.createPair(tokenA.address, tokenB.address)

    // get pair address from event
    const createPairResponse = await uniswapV2Factory.createPair(
      tokenA.address,
      tokenB.address
    );
    const createPairResponseWaited = await createPairResponse.wait();
    const pairAddress = createPairResponseWaited.events[0].args[2];

    // let getPairResponse = await uniswapV2Factory.getPair(tokenA.address, tokenB.address)
    // console.log(getPairResponse)

    const pair = await this.hre.ethers.getContractAt(
      this.names.uniswapV2Pair,
      pairAddress
    );
    return pair;
  }

  public async autoDeployUniswapV2Pairs(state: State) {
    const pairs: Pairs = {};
    for (
      let tokenAIndex = 0;
      tokenAIndex < state.tokenSymbolList.length;
      tokenAIndex++
    ) {
      const tokenASymbol = state.tokenSymbolList[tokenAIndex];
      const tokenA = state.tokens[tokenASymbol];
      pairs[tokenASymbol] = {};
      for (
        let tokenBIndex = tokenAIndex + 1;
        tokenBIndex < state.tokenSymbolList.length;
        tokenBIndex++
      ) {
        const tokenBSymbol = state.tokenSymbolList[tokenBIndex];
        const tokenB = state.tokens[tokenBSymbol];
        const pair = await this.createUniswapV2Pair(
          state.uniswapV2Factory,
          tokenA,
          tokenB
        );
        pairs[tokenASymbol][tokenBSymbol] = pair;
      }
    }
    state.pairs = pairs;
    return state;
  }

  public async deployUniswapV2Router(
    uniswapV2FactoryAddress: any,
    wethAddress: any
  ) {
    const UniswapV2Router02Factory = await this.hre.ethers.getContractFactory(
      this.names.uniswapV2Router02
    );
    const pairContract = await this.hre.ethers.getContractFactory(
      this.names.uniswapV2Pair
    );
    // https://ethereum.stackexchange.com/questions/114170/unit-testing-uniswapv2pair-function-call-to-a-non-contract-account#comment137427_114170
    const initCodeHash = this.hre.ethers.utils.keccak256(pairContract.bytecode);
    const uniswapV2Router02 = await UniswapV2Router02Factory.deploy(
      uniswapV2FactoryAddress,
      wethAddress,
      initCodeHash
    );
    await uniswapV2Router02.deployed();
    return uniswapV2Router02;
  }

  public async autoDeployUniswapV2Router(state: State) {
    state.uniswapV2Router02 = await this.deployUniswapV2Router(
      state.uniswapV2Factory.address,
      state.tokens.WETH.address
    );
    return state;
  }

  public async dripAndInitializePools(
    initializeAccount: any,
    uniswapV2Router02: any,
    tokenA: any,
    tokenB: any,
    poolInitializer: PoolInitializer,
    uniswapDeadlineSeconds: number
  ) {
    const ten: BigNumber = this.hre.ethers.BigNumber.from(10)
    const baseExponentiated = ten.pow(poolInitializer.ratioDecimals);
    const quote = baseExponentiated.mul(poolInitializer.midpointRatio);

    // scale both sides
    const baseMultiplied = baseExponentiated.mul(poolInitializer.ratioMultiplier);
    const quoteMultiplied = quote.mul(poolInitializer.ratioMultiplier);

    // console.log("dripping tokens")
    await tokenA.drip(initializeAccount.address, baseMultiplied.mul(2));
    await tokenB.drip(initializeAccount.address, quoteMultiplied.mul(2));
    await tokenA
      .connect(initializeAccount)
      .approve(uniswapV2Router02.address, this.hre.ethers.constants.MaxUint256);
    await tokenB
      .connect(initializeAccount)
      .approve(uniswapV2Router02.address, this.hre.ethers.constants.MaxUint256);

    // console.log("adding liquidity")
    const deadline = SwapperUtils.relativeDeadline(uniswapDeadlineSeconds);
    await uniswapV2Router02
      .connect(initializeAccount)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        baseMultiplied,
        quoteMultiplied,
        0,
        0,
        initializeAccount.address,
        deadline
      );
  }

  public async autoDripAndInitializePools(state: State) {
    if (state.poolInitializeAccount === undefined) {
      const accounts = await this.hre.ethers.getSigners();
      state.poolInitializeAccount = accounts[1];
    }
    for (
      let tokenAIndex = 1;
      tokenAIndex < state.tokenSymbolList.length;
      tokenAIndex++
    ) {
      const tokenASymbol = state.tokenSymbolList[tokenAIndex];
      const tokenA = state.tokens[tokenASymbol];
      for (
        let tokenBIndex = tokenAIndex + 1;
        tokenBIndex < state.tokenSymbolList.length;
        tokenBIndex++
      ) {
        const tokenBSymbol = state.tokenSymbolList[tokenBIndex];
        const tokenB = state.tokens[tokenBSymbol];
        await this.dripAndInitializePools(
          state.poolInitializeAccount,
          state.uniswapV2Router02,
          tokenA,
          tokenB,
          state.poolInitializer,
          state.uniswapDeadlineSeconds
        );
      }
    }
    return state;
  }

  public async deployTokens(tokenSymbolList: string[]): Promise<Tokens> {
    const FakeTokenFactory = await this.hre.ethers.getContractFactory(
      this.names.faucetToken
    );
    const tokens: Tokens = {};
    for (const tokenSymbol of tokenSymbolList) {
      const token = await FakeTokenFactory.deploy(tokenSymbol);
      await token.deployed();
      tokens[tokenSymbol] = token;
    }
    return tokens;
  }

  public async autoDeployTokens(state: State): Promise<State> {
    state.tokens = await this.deployTokens(state.tokenSymbolList);
    return state;
  }

  public async deployAll(state: State, redeployTokens: boolean) {
    if (redeployTokens) {
      state = await this.autoDeployTokens(state);
    }
    state = await this.autoDeployUniswapV2Factory(state);
    state = await this.autoDeployUniswapV2Pairs(state);
    state = await this.autoDeployUniswapV2Router(state);
    state = await this.autoDripAndInitializePools(state);
    return state;
  }

  public async autoDeployAll(state: State) {
    return this.deployAll(state, true);
  }

  public async deployAdditionalPool(firstState: State, secondState: State) {
    secondState.tokens = firstState.tokens;
    return this.deployAll(secondState, false);
  }

  public async tokenList(tokens: Tokens, chainId: number): Promise<TokenList> {
    let tokenItems: TokenListItem[] = []
    for(let token of Object.values(tokens)) {
      tokenItems.push({
        chainId: chainId,
        name: (await token.name() as string),
        symbol: (await token.symbol() as string),
        decimals: (await token.decimals() as number),
        address: (token.address as string),
      })
    }
    return {
      name: "hardhat",
      tokens: tokenItems
    }
  }

  public async autoTokenList(state: State): Promise<TokenList> {
    return this.tokenList(state.tokens, 1337)
  }

  public static humanTokenAmount(ethers: any, amount: number, decimals: number): BigNumber {
    let places: BigNumber = ethers.BigNumber.from(10).pow(ethers.BigNumber.from(decimals))
    return ethers.BigNumber.from(amount).mul(places)
  }

  public humanTokenAmount(amount: number, decimals: number): BigNumber {
    return SwapperUtils.humanTokenAmount(this.hre.ethers, amount, decimals)
  }
}

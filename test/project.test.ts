// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import path from "path";

import { State, SwapperUtils } from "../src/SwapperUtils";

import { useEnvironment } from "./helpers";

describe("Integration tests examples", function () {
  describe("Hardhat Runtime Environment extension", function () {
    useEnvironment("hardhat-project");

    it("The example filed should say hello", function () {
      assert.equal(this.hre.su.sayHello(), "hello");
    });

    it("Should work with auto functions", async function() {
      await this.hre.run('install-deps', {sourcePathRelativeModifier: ".."})
      await this.hre.run("compile")

      let su = this.hre.su
      let state: State = SwapperUtils.defaultState()
      state = await su.autoDeployUniswapV2Factory(state)
      state = await su.autoDeployTokens(state)
      state = await su.autoDeployUniswapV2Pairs(state)
      state = await su.autoDeployUniswapV2Router(state)
      state = await su.autoDripAndInitializePools(state)
  
      const amountAIn = 10000
      const tokenA = state.tokens["TOKA"]
      const tokenB = state.tokens["TOKB"]
      let amounts = await state.uniswapV2Router02.getAmountsOut(amountAIn, [tokenA.address, tokenB.address])
      const amountA = amounts[0]
      const amountB = amounts[1]
      // console.log(amountB)
      assert.equal(amountA.toString(), `${amountAIn}`)
      assert.equal(amountB.toString(), "906")
    })
  });

  describe("HardhatConfig extension", function () {
    useEnvironment("hardhat-project");

    it("Should add the newPath to the config", function () {
      assert.equal(
        this.hre.config.paths.newPath,
        path.join(process.cwd(), "asd")
      );
    });
  });
});
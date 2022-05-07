// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import path from "path";

import { SwapperUtils } from "../src/SwapperUtils";

import { useEnvironment } from "./helpers";

describe("Integration tests examples", function () {
  describe("Hardhat Runtime Environment extension", function () {
    useEnvironment("hardhat-project");

    it("Should work with individual auto functions", async function () {
      await this.hre.run("install-deps", { sourcePathRelativeModifier: ".." });
      await this.hre.run("compile");

      const su = this.hre.su;
      let state = su.defaultState();
      state = await su.autoDeployUniswapV2Factory(state);
      state = await su.autoDeployTokens(state);
      state = await su.autoDeployUniswapV2Pairs(state);
      state = await su.autoDeployUniswapV2Router(state);
      state = await su.autoDripAndInitializePools(state);

      const amountAIn = 10000;
      const tokenA = state.tokens.TOKA;
      const tokenB = state.tokens.TOKB;
      const amounts = await state.uniswapV2Router02.getAmountsOut(amountAIn, [
        tokenA.address,
        tokenB.address,
      ]);
      const amountA = amounts[0];
      const amountB = amounts[1];
      // console.log(amountB)
      assert.equal(amountA.toString(), `${amountAIn}`);
      assert.equal(amountB.toString(), "19938");
    });

    it("Should work with auto functions", async function () {
      await this.hre.run("install-deps", { sourcePathRelativeModifier: ".." });
      await this.hre.run("compile");

      const su = this.hre.su;
      let state = su.defaultState();
      state = await su.autoDeployAll(state);

      const amountAIn = 10000;
      const tokenA = state.tokens.TOKA;
      const tokenB = state.tokens.TOKB;
      const amounts = await state.uniswapV2Router02.getAmountsOut(amountAIn, [
        tokenA.address,
        tokenB.address,
      ]);
      const amountA = amounts[0];
      const amountB = amounts[1];
      assert.equal(amountA.toString(), `${amountAIn}`);
      assert.equal(amountB.toString(), "19938");
    });

    it("Should work with a second pool and result in price improvement from more liquidity", async function () {
      await this.hre.run("install-deps", { sourcePathRelativeModifier: ".." });
      await this.hre.run("compile");

      const su = this.hre.su;
      let state = su.defaultState();
      state = await su.autoDeployAll(state);
      let secondState = SwapperUtils.defaultState();
      // make second pool twice as large
      secondState.poolInitializer.ratioMultiplier = 2.0;
      secondState = await su.deployAdditionalPool(state, secondState);

      const amountAIn = 10000;
      const tokenA = state.tokens.TOKA;
      const tokenB = state.tokens.TOKB;
      // first pool
      const fristAmounts = await state.uniswapV2Router02.getAmountsOut(
        amountAIn,
        [tokenA.address, tokenB.address]
      );
      const firstAmountB = fristAmounts[1];
      // second pool
      const secondAmounts = await secondState.uniswapV2Router02.getAmountsOut(
        amountAIn,
        [tokenA.address, tokenB.address]
      );
      const secondAmountB = secondAmounts[1];
      assert.isTrue(
        secondAmountB.gt(firstAmountB),
        `${secondAmountB.toString()} > ${firstAmountB.toString()} failed`
      );
    });
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

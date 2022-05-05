// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import path from "path";

import { EthersHardhatRuntimeEnvironment, SwapperUtils } from "../src/SwapperUtils";

import { useEnvironment } from "./helpers";

describe("Integration tests examples", function () {
  describe("Hardhat Runtime Environment extension", function () {
    useEnvironment("hardhat-project");

    // it("Should add the example field", function () {
    //   assert.instanceOf(
    //     this.hre.example,
    //     SwapperUtils
    //   );
    // });

    it("The example filed should say hello", function () {
      assert.equal(this.hre.su.sayHello(), "hello");
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

describe("Unit tests examples", function () {
  describe("ExampleHardhatRuntimeEnvironmentField", function () {
    describe("sayHello", function () {
      it("Should say hello", function () {
        useEnvironment("hardhat-project");
        const field = new SwapperUtils((this.hre as EthersHardhatRuntimeEnvironment), {faucetToken: "test"});
        assert.equal(field.sayHello(), "hello");
      });
    });
  });
});

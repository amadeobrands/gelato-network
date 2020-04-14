// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import { utils } from "ethers";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: CAMS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let ConditionFactory;
  let OtherConditionFactory;
  let ActionFactory;
  let OtherActionFactory;

  let gelatoCore;
  let condition;
  let otherCondition;
  let action;
  let otherAction;

  const gasPriceCeil = utils.parseUnits("20", "gwei");

  // Condition - Actions - Mix
  let cam;
  let otherCAM;

  // ExecClaim for isCAMProvided check
  let execClaim;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    OtherConditionFactory = await ethers.getContractFactory(
      "MockConditionDummy"
    );
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy();
    condition = await ConditionFactory.deploy();
    otherCondition = await OtherConditionFactory.deploy();
    action = await ActionFactory.deploy();
    otherAction = await OtherActionFactory.deploy();

    await gelatoCore.deployed();
    await condition.deployed();
    await otherCondition.deployed();
    await action.deployed();
    await otherAction.deployed();

    cam = new CAM({
      condition: condition.address,
      actions: [action.address],
      gasPriceCeil,
    });

    otherCAM = new CAM({
      condition: condition.address,
      actions: [action.address, otherAction.address],
      gasPriceCeil,
    });

    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();

    // construct ExecClaim for unit test isCAMProvided()
    const gelatoProvider = new GelatoProvider({
      addr: await provider.getAddress(),
      module: constants.AddressZero,
    });
    const _condition = new Condition({
      inst: condition.address,
      data: constants.HashZero,
    });
    const _action = new Action({
      inst: action.address,
      data: constants.HashZero,
      operation: "delegatecall",
    });
    const task = new Task({
      provider: gelatoProvider,
      condition: _condition,
      actions: [_action],
      expiryDate: constants.Zero,
    });
    execClaim = new ExecClaim({
      id: constants.Zero,
      userProxy: constants.AddressZero,
      taskObj: task,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideCAMs
  describe("GelatoCore.GelatoProviders.provideCAMs", function () {
    it("Should allow anyone to provide a single CAM", async function () {
      const camHash = await gelatoCore.camHash(cam);
      await expect(gelatoCore.provideCAMs([cam]))
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          camHash,
          initialState.camGPC,
          cam.gasPriceCeil
        );
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        cam.gasPriceCeil
      );
      expect(await gelatoCore.isCAMProvided(execClaim)).to.be.equal("Ok");
    });

    it("Should allow anyone to provideCAMs", async function () {
      const camHash = await gelatoCore.camHash(cam);
      const otherCAMHash = await gelatoCore.camHash(otherCAM);
      await expect(gelatoCore.provideCAMs([cam, otherCAM]))
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          camHash,
          initialState.camGPC,
          cam.gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          otherCAMHash,
          initialState.camGPC,
          otherCAM.gasPriceCeil
        );
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        cam.gasPriceCeil
      );
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(otherCAM.gasPriceCeil);
    });

    it("Should NOT allow to provide same CAMs again", async function () {
      await gelatoCore.provideCAMs([cam]);

      await expect(gelatoCore.provideCAMs([cam])).to.be.revertedWith(
        "GelatoProviders.provideCAMs: redundant"
      );

      await expect(gelatoCore.provideCAMs([otherCAM, cam])).to.be.revertedWith(
        "GelatoProviders.provideCAMs: redundant"
      );
    });
  });

  // unprovideCAMs
  describe("GelatoCore.GelatoProviders.unprovideCAMs", function () {
    it("Should allow Providers to unprovide a single CAM", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([cam, otherCAM]);

      // camHash
      const camHash = await gelatoCore.camHash(cam);
      const otherCAMHash = await gelatoCore.camHash(otherCAM);

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam]))
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, camHash);
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        initialState.camGPC
      );
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(otherCAM.gasPriceCeil);
    });

    it("Should allow Providers to unprovideCAMs", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([cam, otherCAM]);

      // camHash
      const camHash = await gelatoCore.camHash(cam);
      const otherCAMHash = await gelatoCore.camHash(otherCAM);

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam, otherCAM]))
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, camHash)
        .and.to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, otherCAMHash);
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        initialState.camGPC
      );
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(initialState.camGPC);
    });

    it("Should NOT allow Providers to unprovide not-provided CAMs", async function () {
      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam])).to.be.revertedWith(
        "GelatoProviders.unprovideCAMs: redundant"
      );

      await expect(
        gelatoCore.unprovideCAMs([cam, otherCAM])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");

      // provideCAMs
      await gelatoCore.provideCAMs([cam]);

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([otherCAM])).to.be.revertedWith(
        "GelatoProviders.unprovideCAMs: redundant"
      );

      await expect(
        gelatoCore.unprovideCAMs([cam, otherCAM])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");
    });
  });
});

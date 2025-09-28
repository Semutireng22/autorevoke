import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { AutoRevoker, DelegationRegistryMock, ExpiryCaveatEnforcer, SpendLimitEnforcer } from "../../typechain";

describe("AutoRevoke suite", () => {
  async function deployFixture() {
    const [deployer, delegate] = await ethers.getSigners();

    const ExpiryFactory = await ethers.getContractFactory("ExpiryCaveatEnforcer");
    const expiry = (await ExpiryFactory.deploy()) as ExpiryCaveatEnforcer;

    const SpendFactory = await ethers.getContractFactory("SpendLimitEnforcer");
    const spend = (await SpendFactory.deploy()) as SpendLimitEnforcer;

    const RegistryFactory = await ethers.getContractFactory("DelegationRegistryMock");
    const registry = (await RegistryFactory.deploy()) as DelegationRegistryMock;

    const AutoFactory = await ethers.getContractFactory("AutoRevoker");
    const auto = (await AutoFactory.deploy(await registry.getAddress())) as AutoRevoker;

    return { deployer, delegate, expiry, spend, registry, auto };
  }

  function buildDelegation(delegator: string, delegate: string, salt: string, data: string = "0x") {
    return {
      delegator,
      delegate,
      salt,
      data
    };
  }

  function buildCaveat(enforcer: string, encoded: string) {
    return { enforcer, data: encoded };
  }

  function computeHash(
    delegation: { delegator: string; delegate: string; salt: string; data: string },
    caveats: { enforcer: string; data: string }[]
  ) {
    const abi = ethers.AbiCoder.defaultAbiCoder();
    let encodedCaveats = "0x";
    for (const caveat of caveats) {
      const packed = abi.encode(["address", "bytes32"], [caveat.enforcer, ethers.keccak256(caveat.data)]);
      encodedCaveats = encodedCaveats === "0x" ? packed : (encodedCaveats + packed.slice(2));
    }
    const caveatHash = ethers.keccak256(encodedCaveats);
    return ethers.keccak256(
      abi.encode(
        ["address", "address", "bytes32", "bytes32", "bytes32"],
        [delegation.delegator, delegation.delegate, delegation.salt, ethers.keccak256(delegation.data), caveatHash]
      )
    );
  }

  it("redeem reverts when expired", async () => {
    const { deployer, delegate, registry, expiry } = await loadFixture(deployFixture);
    const now = await time.latest();
    const expiryTs = now - 1;
    const delegation = buildDelegation(await deployer.getAddress(), await delegate.getAddress(), ethers.id("salt1"));
    const caveats = [buildCaveat(await expiry.getAddress(), ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [expiryTs]))];
    const hash = computeHash(delegation, caveats);

    await registry.connect(deployer).createDelegation(delegation, caveats);
    await expect(registry.redeem(hash, "0x"))
      .to.be.revertedWithCustomError(expiry, "Expired")
      .withArgs(hash, await time.latest(), expiryTs);
  });

  it("tracks spend and reverts when limit exceeded", async () => {
    const { deployer, delegate, registry, spend } = await loadFixture(deployFixture);
    const delegation = buildDelegation(await deployer.getAddress(), await delegate.getAddress(), ethers.id("salt2"));
    const caveatData = ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address,uint256,uint256)"], [[
      ethers.ZeroAddress,
      ethers.parseEther("1"),
      ethers.parseEther("0.6")
    ]]);
    const caveats = [buildCaveat(await spend.getAddress(), caveatData)];
    const hash = computeHash(delegation, caveats);

    await registry.connect(deployer).createDelegation(delegation, caveats);

    await expect(registry.redeem(hash, "0x"))
      .to.emit(spend, "SpendUpdated")
      .withArgs(hash, ethers.parseEther("0.6"));

    await expect(registry.redeem(hash, "0x")).to.be.revertedWith("SPEND_LIMIT_EXCEEDED");
  });

  it("auto revoker clears active flag", async () => {
    const { deployer, delegate, registry, auto } = await loadFixture(deployFixture);
    const delegation = buildDelegation(await deployer.getAddress(), await delegate.getAddress(), ethers.id("salt3"));
    const caveats: { enforcer: string; data: string }[] = [];
    const hash = computeHash(delegation, caveats);

    await registry.connect(deployer).createDelegation(delegation, caveats);

    await auto.revoke(hash);
    expect(await registry.active(hash)).to.equal(false);
  });
});

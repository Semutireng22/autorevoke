import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

function loadArtifact(name: string) {
  const artifactPath = path.join(process.cwd(), "artifacts", `${name}.sol`, `${name}.json`);
  const raw = readFileSync(artifactPath, "utf-8");
  return JSON.parse(raw) as { abi: any; bytecode: { object: string } };
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "https://testnet-rpc.monad.xyz/";
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error("PRIVATE_KEY required for deployment – fund via https://faucet.monad.xyz/");
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  console.log(JSON.stringify({ level: "info", msg: "deploy-start", rpcUrl }));

  const registryArtifact = loadArtifact("DelegationRegistryMock");
  const expiryArtifact = loadArtifact("ExpiryCaveatEnforcer");
  const spendArtifact = loadArtifact("SpendLimitEnforcer");
  const autoArtifact = loadArtifact("AutoRevoker");

  const registryFactory = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode.object, wallet);
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();
  console.log(JSON.stringify({ level: "info", msg: "registry-deployed", address: await registry.getAddress() }));

  const expiryFactory = new ethers.ContractFactory(expiryArtifact.abi, expiryArtifact.bytecode.object, wallet);
  const expiry = await expiryFactory.deploy();
  await expiry.waitForDeployment();
  console.log(JSON.stringify({ level: "info", msg: "expiry-deployed", address: await expiry.getAddress() }));

  const spendFactory = new ethers.ContractFactory(spendArtifact.abi, spendArtifact.bytecode.object, wallet);
  const spend = await spendFactory.deploy();
  await spend.waitForDeployment();
  console.log(JSON.stringify({ level: "info", msg: "spend-deployed", address: await spend.getAddress() }));

  const autoFactory = new ethers.ContractFactory(autoArtifact.abi, autoArtifact.bytecode.object, wallet);
  const auto = await autoFactory.deploy(await registry.getAddress());
  await auto.waitForDeployment();
  console.log(JSON.stringify({ level: "info", msg: "auto-deployed", address: await auto.getAddress() }));

  const output = {
    registry: await registry.getAddress(),
    expiry: await expiry.getAddress(),
    spend: await spend.getAddress(),
    autoRevoker: await auto.getAddress(),
    chainId: await wallet.getChainId()
  };

  writeFileSync(path.join(process.cwd(), ".deploy.json"), JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ level: "info", msg: "deploy-success", output }));
}

main().catch((error) => {
  console.error(JSON.stringify({ level: "error", msg: "deploy-failed", error: error.message }));
  process.exit(1);
});

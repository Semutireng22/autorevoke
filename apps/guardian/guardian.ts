import "dotenv/config";
import axios from "axios";
import express from "express";
import { ethers } from "ethers";
import { IndexerClient, RevokeCandidate } from "./indexer-client";

interface GuardianConfig {
  indexerUrl: string;
  bundlerUrl: string;
  registryAddress: string;
  autoRevokerAddress: string;
  pollIntervalMs: number;
  rpcUrl: string;
  serverPort: number;
}

export interface UserOperation {
  sender: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: string;
  initCode: string;
  paymasterAndData: string;
  signature: string;
  metadata: Record<string, unknown>;
}

function loadConfig(): GuardianConfig {
  const registryAddress = process.env.REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const autoRevokerAddress = process.env.AUTOREVOKER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  if (registryAddress === "0x0000000000000000000000000000000000000000" || autoRevokerAddress === "0x0000000000000000000000000000000000000000") {
    console.log(JSON.stringify({ level: "warn", msg: "addresses-unset", registryAddress, autoRevokerAddress }));
  }
  return {
    indexerUrl: process.env.INDEXER_URL ?? "http://localhost:3001",
    bundlerUrl: process.env.BUNDLER_URL ?? "http://localhost:3002/bundler-mock",
    registryAddress,
    autoRevokerAddress,
    pollIntervalMs: 3000,
    rpcUrl: process.env.RPC_URL ?? "https://testnet-rpc.monad.xyz/",
    serverPort: Number(process.env.GUARDIAN_PORT ?? 3002)
  };
}

export function encodeRevokeCall(autoRevoker: string, hash: string): string {
  // ERC-4337 bundler calldata referencing MetaMask Smart Accounts docs: https://docs.metamask.io/smart-accounts/overview/
  const iface = new ethers.Interface(["function revoke(bytes32 delegationHash)"]);
  return iface.encodeFunctionData("revoke", [hash]);
}

export function toUserOperation(candidate: RevokeCandidate, config: GuardianConfig): UserOperation {
  const nonce = BigInt(Date.now());
  return {
    sender: config.autoRevokerAddress,
    callData: encodeRevokeCall(config.autoRevokerAddress, candidate.delegationHash),
    callGasLimit: "0x249f0",
    verificationGasLimit: "0x1d4c0",
    preVerificationGas: "0x5208",
    maxFeePerGas: "0x3b9aca00",
    maxPriorityFeePerGas: "0x3b9aca00",
    nonce: `0x${nonce.toString(16)}`,
    initCode: "0x",
    paymasterAndData: "0x",
    signature: "0x",
    metadata: {
      reason: candidate.reason,
      createdAt: candidate.createdAt,
      registry: config.registryAddress,
      docs: {
        erc4337: "https://eips.ethereum.org/EIPS/eip-4337",
        toolkit: "https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/"
      }
    }
  };
}

async function sendUserOperation(userOperation: UserOperation, bundlerUrl: string) {
  // Bundler simulation logging JSON payload for the hackathon track.
  console.log(JSON.stringify({ level: "info", msg: "sendUserOperation", bundlerUrl, userOperation }));
  await axios.post(bundlerUrl, { userOperation }, { timeout: 5000 }).catch((error) => {
    console.log(JSON.stringify({ level: "error", msg: "bundler-error", error: error.message }));
    throw error;
  });
}

export class Guardian {
  private readonly config: GuardianConfig;
  private readonly indexer: IndexerClient;
  private readonly processed = new Set<string>();
  private readonly send: typeof sendUserOperation;
  private timer: NodeJS.Timer | null = null;

  constructor(configOverride: Partial<GuardianConfig> = {}, deps: { indexer?: IndexerClient; sendUserOperation?: typeof sendUserOperation } = {}) {
    this.config = { ...loadConfig(), ...configOverride };
    this.indexer = deps.indexer ?? new IndexerClient(this.config.indexerUrl);
    this.send = deps.sendUserOperation ?? sendUserOperation;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        console.log(JSON.stringify({ level: "error", msg: "tick-error", error: error.message }));
      });
    }, this.config.pollIntervalMs);
    console.log(JSON.stringify({ level: "info", msg: "guardian-start", pollIntervalMs: this.config.pollIntervalMs }));
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    const candidates = await this.indexer.fetchCandidates();
    for (const candidate of candidates) {
      if (this.processed.has(candidate.delegationHash)) {
        continue;
      }
      await this.handleCandidate(candidate);
    }
  }

  async panic(delegationHash: string) {
    const candidates = await this.indexer.fetchCandidates();
    const target = candidates.find((item) => item.delegationHash === delegationHash);
    if (!target) {
      throw new Error("candidate-not-found");
    }
    this.processed.delete(delegationHash);
    await this.handleCandidate(target);
  }

  private async handleCandidate(candidate: RevokeCandidate) {
    const userOp = toUserOperation(candidate, this.config);
    let attempt = 0;
    while (attempt < 3) {
      try {
        await this.send(userOp, this.config.bundlerUrl);
        await this.indexer.markProcessed(candidate.delegationHash);
        this.processed.add(candidate.delegationHash);
        console.log(JSON.stringify({ level: "info", msg: "candidate-processed", hash: candidate.delegationHash }));
        return;
      } catch (error: any) {
        attempt += 1;
        const delay = 1000 * 2 ** (attempt - 1);
        console.log(JSON.stringify({ level: "warn", msg: "retry", attempt, delay }));
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (attempt >= 3) {
          console.log(JSON.stringify({ level: "error", msg: "candidate-failed", hash: candidate.delegationHash, error: error.message }));
        }
      }
    }
  }

  getConfig() {
    return this.config;
  }
}

async function main() {
  const guardian = new Guardian();
  guardian.start();

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", rpcUrl: guardian.getConfig().rpcUrl });
  });

  app.post("/panic-revoke", async (req, res) => {
    const hash = req.body?.delegationHash as string | undefined;
    if (!hash) {
      return res.status(400).json({ error: "delegationHash required" });
    }
    try {
      await guardian.panic(hash);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/bundler-mock", (_req, res) => {
    res.json({ ok: true, message: "Bundler simulated" });
  });

  const port = guardian.getConfig().serverPort;
  app.listen(port, () => {
    console.log(JSON.stringify({ level: "info", msg: "guardian-server", port }));
  });

  process.on("SIGINT", () => {
    guardian.stop();
    process.exit(0);
  });
}

main();

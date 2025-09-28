import { describe, it, expect, vi } from "vitest";
import { Guardian } from "../guardian";
import { IndexerClient, RevokeCandidate } from "../indexer-client";

class StubIndexer extends IndexerClient {
  public fetch = vi.fn<[], Promise<RevokeCandidate[]>>();
  public mark = vi.fn<[string], Promise<void>>();

  constructor(private readonly candidates: RevokeCandidate[]) {
    super("http://stub");
    this.fetch.mockResolvedValue(this.candidates);
    this.mark.mockResolvedValue();
  }

  override async fetchCandidates(): Promise<RevokeCandidate[]> {
    return this.fetch();
  }

  override async markProcessed(hash: string): Promise<void> {
    return this.mark(hash);
  }
}

describe("Guardian", () => {
  it("processes candidates and marks them processed", async () => {
    const candidate: RevokeCandidate = {
      delegationHash: "0x123",
      reason: "expired",
      createdAt: Date.now() / 1000,
      processed: false
    };

    const indexer = new StubIndexer([candidate]);
    const send = vi.fn().mockResolvedValue(undefined);

    const guardian = new Guardian(
      { bundlerUrl: "http://bundler", indexerUrl: "http://stub", autoRevokerAddress: "0xaaa", registryAddress: "0xbbb", pollIntervalMs: 10, rpcUrl: "https://testnet-rpc.monad.xyz/" },
      { indexer, sendUserOperation: send }
    );

    await guardian.tick();

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][1]).toBe("http://bundler");
    expect(indexer.mark).toHaveBeenCalledWith("0x123");
  });
});

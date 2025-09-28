import axios from "axios";

export interface RevokeCandidate {
  delegationHash: string;
  reason: "expired" | "over-limit";
  createdAt: number;
  processed: boolean;
}

export class IndexerClient {
  constructor(private readonly baseUrl: string) {}

  async fetchCandidates(): Promise<RevokeCandidate[]> {
    const { data } = await axios.get<RevokeCandidate[]>(`${this.baseUrl}/candidates`, { timeout: 5000 });
    return data;
  }

  async markProcessed(hash: string): Promise<void> {
    await axios.post(`${this.baseUrl}/mark-processed`, { delegationHash: hash }, { timeout: 5000 });
  }
}

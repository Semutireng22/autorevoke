import "dotenv/config";
import axios from "axios";

async function main() {
  const indexerUrl = process.env.INDEXER_URL ?? "http://localhost:3001";
  const now = Math.floor(Date.now() / 1000);
  const body = {
    delegations: [
      {
        delegationHash: "0xdeadbeef".padEnd(66, "0"),
        delegator: "0x0000000000000000000000000000000000000001",
        delegate: "0x0000000000000000000000000000000000000002",
        expiry: now - 60,
        limit: "0",
        spent: "0",
        allowedTargets: [],
        active: true
      },
      {
        delegationHash: "0xfeedface".padEnd(66, "0"),
        delegator: "0x0000000000000000000000000000000000000003",
        delegate: "0x0000000000000000000000000000000000000004",
        expiry: now + 600,
        limit: "100",
        spent: "150",
        allowedTargets: [],
        active: true
      }
    ],
    approvals: []
  };

  const { data } = await axios.post(`${indexerUrl}/seed`, body, { timeout: 5000 });
  console.log(JSON.stringify({ level: "info", msg: "seed-complete", indexerUrl, data }));
}

main().catch((error) => {
  console.error(JSON.stringify({ level: "error", msg: "seed-failed", error: error.message }));
  process.exit(1);
});

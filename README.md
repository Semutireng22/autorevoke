# Auto Revoke – MetaMask Smart Accounts x Monad Dev Cook-Off

End-to-end monorepo showcasing automated delegation revocation on the ⚙️ [Monad Testnet](https://docs.monad.xyz/) using 🦊 [MetaMask Smart Accounts](https://docs.metamask.io/smart-accounts/overview/), the 🧰 [Delegation Toolkit](https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/), and a mock 📡 [Envio HyperIndex](https://docs.envio.dev/hyperindex).

```
Next.js UI ──► Mock HyperIndex (Express) ──► Guardian (userOp builder) ──► Bundler mock ──► AutoRevoker.sol ──► DelegationRegistryMock
            ▲                                                                                                          │
            └──────────────────────────── Seed demo data & allow manual “panic revoke” flows ───────────────────────────┘
```

## Repository layout

- `contracts/` – Solidity ^0.8.24 suite deployed via Hardhat (`DelegationRegistryMock`, caveat enforcers, `AutoRevoker`).
- `apps/indexer-mock/` – Express-based Envio HyperIndex simulator generating revoke candidates.
- `apps/guardian/` – Polling automation that crafts [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) userOperations and marks candidates processed.
- `apps/web/` – Next.js 15 App Router dashboard with Tailwind-esque utility styling.
- `scripts/` – Deployment (`deploy-contracts.ts`) and demo seeding (`fill-demo-data.ts`).

All components share TypeScript tooling (`eslint`, `vitest`, `ts-node`) to keep setup frictionless.

## Prerequisites

- Node.js 20+
- npm
- MetaMask (Smart Account beta enabled) for signing on Monad Testnet
- Test MON from the [Monad faucet](https://faucet.monad.xyz/)

## Quick start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```
   Update deployed addresses once contracts are live. Leaving zeros triggers UI/log warnings but local mocks still run.

3. **Compile & test contracts**
   ```bash
   npm run contracts:compile
   npm run contracts:test
   ```
   Uses Hardhat + [@nomicfoundation/hardhat-toolbox](https://hardhat.org/) with unit tests covering expiry and spend-limit caveats.

4. **Deploy to Monad Testnet**
   ```bash
   npm run contracts:compile
   npm run contracts:deploy
   ```
   - Requires `PRIVATE_KEY` in `.env` funded via the faucet.
   - Outputs `.deploy.json` containing contract addresses.
   - Reference the Monad deploy guide: https://docs.monad.xyz/developers/deploying

5. **Launch local services**
   ```bash
   npm run indexer   # Mock Envio HyperIndex on http://localhost:3001
   npm run guardian  # Guardian automation & bundler mock on http://localhost:3002
   npm run web       # Next.js dashboard on http://localhost:3000
   ```

6. **Seed demo data** (optional)
   ```bash
   npm run seed
   ```
   Populates expired/over-limit delegations so the Guardian has work to do.

## Demo flow

1. Open `http://localhost:3000` and review the environment panel.
2. Use **Create Delegation** to submit a delegation via MetaMask Smart Accounts. The form encodes expiry/spend caveats and pings the mock HyperIndex, mirroring [Delegation Toolkit caveats](https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/).
3. The **Guardian** polls `/candidates`, builds a revoke userOperation (logging JSON for inspection), and `POST`s to the bundler mock per [MetaMask userOperation reference](https://docs.metamask.io/smart-accounts/overview/).
4. The indexer marks the candidate processed; the UI reflects the cleared state.
5. Hit **Panic Revoke** on any candidate to force immediate Guardian processing—ideal for testing manual overrides.

## Guardian automation

- Polls every 3 seconds with exponential backoff retries.
- Constructs `AutoRevoker.revoke` calldata referencing the [`AutoRevoker.sol`](contracts/AutoRevoker.sol) ABI.
- Logs structured JSON for bundler submissions while hitting the `/bundler-mock` endpoint.
- Maintains an in-memory dedupe set so repeated candidates don’t spam the bundler.
- Honors doc links in metadata for quick cross-referencing during demos.

## Indexer mock

- Stores delegations/approvals in-memory, mirroring Envio HyperIndex behavior for local dev.
- Candidate rules:
  - `now > expiry` ⇒ `reason: "expired"`
  - `spent >= limit` ⇒ `reason: "over-limit"`
- `/seed` endpoint lets scripts or the UI push demo data; `/mark-processed` mirrors Guardian acknowledgements.
- Replace this service with a real HyperIndex by aligning REST semantics per https://docs.envio.dev/hyperindex.

## Frontend details

- Next.js 15 App Router with client components for wallet interaction.
- Uses `viem` to build structured calldata, compute delegation hashes, and submit transactions.
- Highlights documentation links (MetaMask Smart Accounts, Delegation Toolkit, ERC-4337, Monad) wherever integrations occur.
- UI warns when `.env` still holds zero addresses, prompting deployment via Hardhat scripts.

## Troubleshooting

- **Guardian warns about addresses:** Deploy contracts and update `.env`. The warning ensures userOperations reference real targets.
- **MetaMask errors on writeContract:** Ensure the Smart Account beta is enabled and the chain RPC matches `NEXT_PUBLIC_RPC_URL`.
- **Indexer shows no candidates:** Confirm `/seed` call succeeded or wait for expiry/spend limit breaches to occur.
- **Deploy script fails:** Verify artifacts exist (`npm run contracts:compile`) and `PRIVATE_KEY` is set with sufficient MON.

## Testing matrix

| Command | Purpose |
| --- | --- |
| `npm run contracts:test` | Hardhat unit tests covering caveat enforcement and AutoRevoker integration |
| `npm run guardian -- --test` | Not required; use `vitest` within `apps/guardian` for unit tests (`npx vitest run apps/guardian`) |
| `npx vitest run apps/web` | Frontend smoke test ensures layout renders |

## Linking docs on-chain & off-chain

- **Smart Accounts & Delegations:** Inline comments reference the MetaMask documentation when building calldata or validating caveats.
- **ERC-7710 data model:** `Types.sol` + frontend hashing logic follow the spec for deterministic delegation IDs.
- **ERC-4337 userOperations:** Guardian metadata includes the spec URL for auditors to cross-check formatting.
- **Monad specifics:** README + UI call out RPC, faucet, and deployment docs.
- **Envio integration:** Indexer comments link to HyperIndex docs for easy migration to managed indexing.

Enjoy automating delegation safety nets for the HackQuest “Best On-Chain Automation” track! 🚀

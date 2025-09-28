# Indexer Mock

This Express server mimics [Envio HyperIndex](https://docs.envio.dev/hyperindex) APIs for the Auto-Revoke stack. It stores delegations, approvals, and evaluates expiry or spend limit caveats to generate revoke candidates consumed by the Guardian automation loop.

## Endpoints

- `GET /candidates` – return unprocessed revoke candidates
- `POST /mark-processed` – mark a candidate processed
- `POST /seed` – seed delegations/approvals for local demos
- `GET /delegations` / `GET /approvals` – inspect current state

Start with `npm run indexer`. Configure `INDEXER_PORT` (default `3001`).

import type { Request, Response, NextFunction } from "express";

export interface DelegationRecord {
  delegationHash: string;
  delegator: string;
  delegate: string;
  expiry: number;
  limit: string;
  spent: string;
  allowedTargets: string[];
  active: boolean;
}

export interface ApprovalRecord {
  owner: string;
  operatorOrSpender: string;
  kind: "ERC20" | "ERC721";
  amountOrFlag: string;
}

export interface RevokeCandidate {
  delegationHash: string;
  reason: "expired" | "over-limit";
  createdAt: number;
  processed: boolean;
}

export interface IndexerState {
  delegations: Map<string, DelegationRecord>;
  approvals: Map<string, ApprovalRecord>;
  candidates: Map<string, RevokeCandidate>;
}

export const state: IndexerState = {
  delegations: new Map(),
  approvals: new Map(),
  candidates: new Map()
};

export function jsonLogger(req: Request, _res: Response, next: NextFunction) {
  // Provide traceability similar to Envio HyperIndex logs: https://docs.envio.dev/hyperindex
  console.log(JSON.stringify({ level: "info", msg: "request", method: req.method, path: req.path }));
  next();
}

export function candidateFromDelegation(record: DelegationRecord): RevokeCandidate | null {
  const now = Math.floor(Date.now() / 1000);
  if (!record.active) {
    return null;
  }
  if (record.expiry > 0 && now > record.expiry) {
    return {
      delegationHash: record.delegationHash,
      reason: "expired",
      createdAt: now,
      processed: false
    };
  }
  const limit = BigInt(record.limit);
  const spent = BigInt(record.spent);
  if (limit > 0n && spent >= limit) {
    return {
      delegationHash: record.delegationHash,
      reason: "over-limit",
      createdAt: now,
      processed: false
    };
  }
  return null;
}

export function ensureCandidate(record: DelegationRecord) {
  const candidate = candidateFromDelegation(record);
  if (!candidate) {
    return;
  }
  const existing = state.candidates.get(candidate.delegationHash);
  if (existing) {
    existing.reason = candidate.reason;
    existing.processed = false;
    existing.createdAt = candidate.createdAt;
  } else {
    state.candidates.set(candidate.delegationHash, candidate);
  }
}

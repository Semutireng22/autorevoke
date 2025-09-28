import { Router } from "express";
import { candidateFromDelegation, ensureCandidate, state, DelegationRecord, ApprovalRecord } from "./models";

const router = Router();

router.get("/candidates", (_req, res) => {
  const list = Array.from(state.candidates.values()).filter((candidate) => !candidate.processed);
  res.json(list);
});

router.post("/mark-processed", (req, res) => {
  const { delegationHash } = req.body as { delegationHash?: string };
  if (!delegationHash) {
    return res.status(400).json({ error: "delegationHash required" });
  }
  const candidate = state.candidates.get(delegationHash);
  if (!candidate) {
    return res.status(404).json({ error: "not found" });
  }
  candidate.processed = true;
  res.json({ ok: true });
});

router.post("/seed", (req, res) => {
  const delegations = (req.body?.delegations as DelegationRecord[] | undefined) ?? [];
  const approvals = (req.body?.approvals as ApprovalRecord[] | undefined) ?? [];
  for (const delegation of delegations) {
    state.delegations.set(delegation.delegationHash, delegation);
    ensureCandidate(delegation);
  }
  for (const approval of approvals) {
    state.approvals.set(`${approval.owner}:${approval.operatorOrSpender}:${approval.kind}`, approval);
  }
  const seededCandidates = delegations
    .map((item) => candidateFromDelegation(item))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  res.json({ ok: true, delegations: delegations.length, approvals: approvals.length, candidates: seededCandidates });
});

router.get("/delegations", (_req, res) => {
  res.json(Array.from(state.delegations.values()));
});

router.get("/approvals", (_req, res) => {
  res.json(Array.from(state.approvals.values()));
});

export default router;

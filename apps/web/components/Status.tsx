"use client";

import { useEffect, useState } from "react";

interface Candidate {
  delegationHash: string;
  reason: "expired" | "over-limit";
  createdAt: number;
}

export function Status() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch((process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001") + "/candidates", { cache: "no-store" });
      const data = await res.json();
      setCandidates(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const panic = async (delegationHash: string) => {
    try {
      setError("");
      setMessage("Sending panic revoke via Guardian userOperation...");
      await fetch("/api/panic-revoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delegationHash })
      });
      await load();
      setMessage("Panic revoke requested. Monitor Guardian logs for ERC-4337 userOperation submission.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to panic revoke");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Guardian Status</h2>
        <button onClick={load} className="px-3 py-1 rounded border border-slate-600 text-sm" disabled={loading}>
          Refresh
        </button>
      </div>
      <p className="text-sm text-slate-300">
        Candidates originate from the mock HyperIndex following https://docs.envio.dev/ guidance.
      </p>
      {message && <p className="text-xs text-green-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ul className="space-y-3">
        {candidates.map((candidate) => (
          <li key={candidate.delegationHash} className="border border-slate-700 rounded-lg p-4">
            <p className="font-mono text-xs break-all">{candidate.delegationHash}</p>
            <p className="text-sm">Reason: {candidate.reason}</p>
            <button onClick={() => panic(candidate.delegationHash)} className="mt-2 px-3 py-1 bg-red-500 rounded text-white text-sm">
              Panic Revoke
            </button>
          </li>
        ))}
      </ul>
      {candidates.length === 0 && <p className="text-sm text-slate-400">No revoke candidates – delegations are healthy.</p>}
    </section>
  );
}

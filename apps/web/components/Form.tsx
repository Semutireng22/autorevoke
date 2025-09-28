"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Hex, encodeAbiParameters, keccak256, parseAbiParameters, zeroAddress } from "viem";
import { delegationRegistryAbi } from "../lib/abi";
import { getWalletClient } from "../lib/viem";

const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? zeroAddress;
const expiryEnforcer = process.env.NEXT_PUBLIC_EXPIRY_ENFORCER ?? zeroAddress;
const spendEnforcer = process.env.NEXT_PUBLIC_SPEND_ENFORCER ?? zeroAddress;

interface Props {
  onSubmitted?: (payload: { delegationHash: Hex }) => void;
}

interface FormState {
  expiry: string;
  limit: string;
  allowedTargets: string;
  delegate: string;
}

const initialState: FormState = {
  expiry: "",
  limit: "",
  allowedTargets: "",
  delegate: ""
};

function randomSalt(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

function computeDelegationHash(delegation: { delegator: Hex; delegate: Hex; salt: Hex; data: Hex }, caveats: { enforcer: Hex; data: Hex }[]): Hex {
  const caveatEncoded = caveats.reduce((acc, caveat) => {
    const encoded = encodeAbiParameters(parseAbiParameters("address enforcer, bytes32 dataHash"), [caveat.enforcer, keccak256(caveat.data)]);
    return (acc + encoded.slice(2)) as string;
  }, "0x");
  const caveatHash = keccak256(caveatEncoded as Hex);
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("address delegator, address delegate, bytes32 salt, bytes32 dataHash, bytes32 caveatHash"),
      [delegation.delegator, delegation.delegate, delegation.salt, keccak256(delegation.data), caveatHash]
    )
  );
}

export function Form({ onSubmitted }: Props) {
  const [state, setState] = useState<FormState>(initialState);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setState((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("Preparing delegation...");
    setLoading(true);
    try {
      const wallet = await getWalletClient();
      const [account] = await wallet.getAddresses();
      if (!account) {
        throw new Error("No account from wallet");
      }
      const delegator = account;
      const delegate = (state.delegate || account) as Hex;
      const salt = randomSalt();
      const expirySeconds = state.expiry ? BigInt(state.expiry) : 0n;
      const limit = state.limit ? BigInt(state.limit) : 0n;

      const caveats: { enforcer: Hex; data: Hex }[] = [];
      if (expirySeconds > 0n) {
        caveats.push({
          enforcer: (expiryEnforcer as Hex) ?? zeroAddress,
          data: encodeAbiParameters(parseAbiParameters("uint256"), [expirySeconds])
        });
      }
      if (limit > 0n) {
        caveats.push({
          enforcer: (spendEnforcer as Hex) ?? zeroAddress,
          data: encodeAbiParameters(parseAbiParameters("address token, uint256 limit, uint256 increment"), [zeroAddress, limit, limit])
        });
      }

      const delegation = {
        delegator,
        delegate,
        salt,
        data: "0x" as Hex
      };

      const txHash = await wallet.writeContract({
        address: registryAddress as Hex,
        abi: delegationRegistryAbi,
        functionName: "createDelegation",
        args: [delegation, caveats]
      });

      const delegationHash = computeDelegationHash(delegation, caveats);
      setStatus(`Delegation submitted in tx ${txHash}`);

      // Notify mock indexer to track automation, akin to Envio HyperIndex integration: https://docs.envio.dev/
      const allowedTargets = state.allowedTargets
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await fetch((process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001") + "/seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          delegations: [
            {
              delegationHash,
              delegator,
              delegate,
              expiry: Number(expirySeconds),
              limit: limit.toString(),
              spent: "0",
              allowedTargets,
              active: true
            }
          ],
          approvals: []
        })
      });

      onSubmitted?.({ delegationHash });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to create delegation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 bg-slate-900/40 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-semibold">Create Delegation</h2>
      <p className="text-sm text-slate-300">
        Writes to DelegationRegistryMock using MetaMask Smart Accounts flow per 🦊 docs.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Delegate Address</span>
        <input value={state.delegate} onChange={updateField("delegate")} placeholder="0x..." className="mt-1 w-full rounded bg-slate-800 p-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Expiry (unix seconds)</span>
        <input value={state.expiry} onChange={updateField("expiry")} placeholder="1716400000" className="mt-1 w-full rounded bg-slate-800 p-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Spend Limit (wei)</span>
        <input value={state.limit} onChange={updateField("limit")} placeholder="1000000000000000000" className="mt-1 w-full rounded bg-slate-800 p-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Allowed Targets (comma-separated)</span>
        <input value={state.allowedTargets} onChange={updateField("allowedTargets")} placeholder="0xTarget,0xTarget" className="mt-1 w-full rounded bg-slate-800 p-2" />
      </label>
      <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-500 text-white font-semibold">
        {loading ? "Creating..." : "Create Delegation"}
      </button>
      {status && <p className="text-xs text-green-400">{status}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {(expiryEnforcer === zeroAddress || spendEnforcer === zeroAddress) && (
        <p className="text-xs text-amber-400">
          Warning: Enforcer addresses not configured. Update `.env` after deploying caveats on Monad Testnet via https://docs.monad.xyz/.
        </p>
      )}
    </form>
  );
}

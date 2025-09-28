import { Form } from "../components/Form";
import { Status } from "../components/Status";

const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? "0x0";
const autoRevokerAddress = process.env.NEXT_PUBLIC_AUTOREVOKER_ADDRESS ?? "0x0";
const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001";
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz/";

export default function Page() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8 text-slate-100">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Auto-Revoke Dashboard</h1>
        <p className="text-slate-300">
          Automate Monad delegations with MetaMask Smart Accounts and Delegation Toolkit caveats.
          Docs: 🦊 <a className="underline" href="https://docs.metamask.io/smart-accounts/overview/">Smart Accounts</a>, 🧰 <a className="underline" href="https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/">Delegation Toolkit</a>, 📜 <a className="underline" href="https://eips.ethereum.org/EIPS/eip-4337">ERC-4337</a>, ⚙️ <a className="underline" href="https://docs.monad.xyz/">Monad</a>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
            <h3 className="font-semibold mb-2">Environment</h3>
            <ul className="space-y-1 font-mono text-xs">
              <li>RPC: {rpcUrl}</li>
              <li>Registry: {registryAddress}</li>
              <li>AutoRevoker: {autoRevokerAddress}</li>
              <li>Indexer: {indexerUrl}</li>
            </ul>
            {(registryAddress === "0x0" || autoRevokerAddress === "0x0") && (
              <p className="text-amber-400 text-xs mt-2">
                Warning: update `.env` with deployed addresses after running scripts/deploy-contracts.ts following https://docs.monad.xyz/developers/deploying.
              </p>
            )}
          </div>
          <div className="bg-slate-900/50 p-4 rounded border border-slate-700 text-xs space-y-2">
            <p>
              Guardian automation builds ERC-4337 userOperations to call AutoRevoker.revoke, then marks candidates processed on the Envio-style indexer.
            </p>
            <p>
              Use the form to create delegations and the status panel to trigger panic revokes when expiry/spend caveats are violated.
            </p>
          </div>
        </div>
      </section>
      <Form />
      <Status />
    </main>
  );
}

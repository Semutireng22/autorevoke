"use client";

import { createPublicClient, createWalletClient, custom, http } from "viem";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz/";

const monadChain = {
  id: 20143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] }
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" }
  }
} as const;

export const publicClient = createPublicClient({
  chain: monadChain,
  transport: http(rpcUrl)
});

export async function getWalletClient() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not available – requires MetaMask per https://docs.metamask.io/smart-accounts/overview/");
  }
  return createWalletClient({
    chain: monadChain,
    transport: custom((window as any).ethereum)
  });
}

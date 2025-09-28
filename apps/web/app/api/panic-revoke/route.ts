import { NextRequest, NextResponse } from "next/server";

const guardianUrl = process.env.NEXT_PUBLIC_INDEXER_URL ? process.env.NEXT_PUBLIC_INDEXER_URL.replace(/3001$/, "3002") : undefined;
const explicitGuardian = process.env.GUARDIAN_URL ?? process.env.NEXT_PUBLIC_GUARDIAN_URL ?? guardianUrl ?? "http://localhost:3002";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const delegationHash: string | undefined = body?.delegationHash;
  if (!delegationHash) {
    return NextResponse.json({ error: "delegationHash required" }, { status: 400 });
  }
  const response = await fetch(`${explicitGuardian}/panic-revoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ delegationHash })
  });
  const json = await response.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: response.status });
}

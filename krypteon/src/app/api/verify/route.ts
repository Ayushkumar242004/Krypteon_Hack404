import { NextResponse } from "next/server";
import { fetchVerifiedSource, saveSourcePayload } from "../../../../libs/fetchSource";

export async function POST(req: Request) {
  const { contractAddress, network } = await req.json();

  if (!contractAddress) {
    return NextResponse.json({ ok: false, error: "contractAddress is required" }, { status: 400 });
  }

  try {
    const payload = await fetchVerifiedSource(contractAddress, network || "mainnet");

    if (!payload || payload.foundOn === "none") {
      return NextResponse.json({ ok: false, error: "Source not found" }, { status: 404 });
    }

    // Only return payload, skip saving locally if not needed
    return NextResponse.json({ ok: true, payload });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "Unknown error" }, { status: 500 });
  }
}
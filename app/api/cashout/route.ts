import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { startCashout } from "@/lib/service/cashout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { provider?: string; asset?: string; amount?: string };
    return NextResponse.json(await startCashout(body));
  } catch (error) {
    return jsonError(error);
  }
}

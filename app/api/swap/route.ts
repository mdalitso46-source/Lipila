import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { swap } from "@/lib/service/trade";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { from?: string; to?: string; amount?: string };
    return NextResponse.json(await swap(body));
  } catch (error) {
    return jsonError(error);
  }
}

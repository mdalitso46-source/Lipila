import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { refreshCashout } from "@/lib/service/cashout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await refreshCashout(id));
  } catch (error) {
    return jsonError(error);
  }
}

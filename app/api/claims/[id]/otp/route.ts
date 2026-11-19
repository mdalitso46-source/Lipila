import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requestClaimOtp } from "@/lib/service/claims-public";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { phone?: string };
    return NextResponse.json(await requestClaimOtp(id, body.phone || ""));
  } catch (error) {
    return jsonError(error);
  }
}

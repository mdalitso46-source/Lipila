import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { publicClaim } from "@/lib/service/claims-public";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await publicClaim(id));
  } catch (error) {
    return jsonError(error);
  }
}

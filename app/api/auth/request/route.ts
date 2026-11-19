import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requestOtp } from "@/lib/service/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string };
    return NextResponse.json(await requestOtp(body.phone || ""));
  } catch (error) {
    return jsonError(error);
  }
}

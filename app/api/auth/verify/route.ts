import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { verifyOtp } from "@/lib/service/auth";
import { cookieOptions, SESSION_COOKIE } from "@/lib/service/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; code?: string };
    const result = await verifyOtp(body.phone || "", body.code || "");
    const response = NextResponse.json({ user: result.user });
    response.cookies.set(SESSION_COOKIE, result.token, cookieOptions(request));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

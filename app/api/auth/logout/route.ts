import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { logout } from "@/lib/service/auth";
import { cookieOptions, SESSION_COOKIE } from "@/lib/service/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("cookie")?.match(/(?:^|;\s*)lipila_session=([^;]+)/)?.[1];
    await logout(token ? decodeURIComponent(token) : undefined);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

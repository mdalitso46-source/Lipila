import { cookies } from "next/headers";
import { sha256 } from "../crypto";
import { HttpError } from "../errors";
import { getStore } from "../store";
import type { User } from "../store/types";

export const SESSION_COOKIE = "lipila_session";

export function cookieOptions(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  const protocol = forwarded || new URL(request.url).protocol.replace(":", "");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: protocol === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function readSessionPhone(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const store = await getStore();
  const session = await store.getSession(sha256(token));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session.phone;
}

export async function requireUser(): Promise<User> {
  const phone = await readSessionPhone();
  if (!phone) throw new HttpError("Sign in again.", 401);
  const store = await getStore();
  const user = await store.getUser(phone);
  if (!user) throw new HttpError("Sign in again.", 401);
  return user;
}

export function publicUser(user: User) {
  return { phone: user.phone, publicKey: user.publicKey, status: user.status };
}

export function requestOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

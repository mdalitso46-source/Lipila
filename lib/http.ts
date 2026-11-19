import { NextResponse } from "next/server";
import { httpError } from "./errors";

export function jsonError(error: unknown) {
  const parsed = httpError(error);
  return NextResponse.json({ error: parsed.message }, { status: parsed.status });
}

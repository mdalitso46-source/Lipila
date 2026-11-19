import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { sendToPhone } from "@/lib/service/send";
import { requestOrigin } from "@/lib/service/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; amount?: string; asset?: string };
    return NextResponse.json(await sendToPhone(body, requestOrigin(request)));
  } catch (error) {
    return jsonError(error);
  }
}

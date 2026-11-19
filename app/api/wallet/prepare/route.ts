import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prepareUsdc } from "@/lib/service/wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    return NextResponse.json(await prepareUsdc());
  } catch (error) {
    return jsonError(error);
  }
}

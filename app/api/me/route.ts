import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { homeForCurrentUser } from "@/lib/service/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await homeForCurrentUser());
  } catch (error) {
    return jsonError(error);
  }
}

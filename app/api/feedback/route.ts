import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { listMyFeedback, submitFeedback } from "@/lib/service/feedback";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listMyFeedback());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rating?: number; area?: string; message?: string };
    return NextResponse.json(await submitFeedback(body));
  } catch (error) {
    return jsonError(error);
  }
}

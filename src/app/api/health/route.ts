import { NextResponse } from "next/server";

import { getSystemState } from "@/lib/services/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const refreshState = getSystemState("last_refresh_at");
  return NextResponse.json({
    ok: true,
    lastRefreshAt: refreshState?.value ?? null,
    now: new Date().toISOString()
  });
}

import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { refreshAllData } from "@/lib/services/update-service";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-refresh-secret") ??
    "";

  return secret === env.ADMIN_REFRESH_SECRET;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await refreshAllData({ force: true });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await refreshAllData({ force: true });
  return NextResponse.json(result);
}

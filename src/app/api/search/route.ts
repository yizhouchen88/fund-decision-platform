import { NextRequest, NextResponse } from "next/server";

import { searchFunds } from "@/lib/services/fund-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(await searchFunds(query));
}

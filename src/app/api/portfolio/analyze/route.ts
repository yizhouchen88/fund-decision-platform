import { NextRequest, NextResponse } from "next/server";

import { analyzePortfolio } from "@/lib/analysis/portfolio";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  return NextResponse.json(analyzePortfolio(payload));
}

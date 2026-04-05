import { NextRequest, NextResponse } from "next/server";

import { analyzePortfolio } from "@/lib/analysis/portfolio";
import { analyzePortfolioHoldings } from "@/lib/services/portfolio-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (Array.isArray(payload?.holdings)) {
    return NextResponse.json(
      await analyzePortfolioHoldings(payload.holdings, payload.totalCapital)
    );
  }

  return NextResponse.json(analyzePortfolio(payload));
}

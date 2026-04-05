import { NextResponse } from "next/server";

import { getRecommendationData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getRecommendationData());
}

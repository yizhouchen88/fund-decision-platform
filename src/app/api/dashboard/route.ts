import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getDashboardData());
}

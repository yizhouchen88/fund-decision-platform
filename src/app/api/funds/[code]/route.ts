import { NextResponse } from "next/server";

import { getFundDetail } from "@/lib/services/fund-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { code } = await context.params;
  return NextResponse.json(await getFundDetail(code));
}

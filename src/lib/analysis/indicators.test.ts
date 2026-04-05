import { describe, expect, it } from "vitest";

import { calculateMetrics, analyzeTrend } from "@/lib/analysis/indicators";
import type { NavPoint } from "@/types/domain";

function buildSeries(values: number[]): NavPoint[] {
  return values.map((nav, index) => ({
    code: "510300",
    date: `2025-01-${String(index + 1).padStart(2, "0")}`,
    nav
  }));
}

describe("indicators", () => {
  it("calculates positive trend metrics for rising series", () => {
    const values = Array.from({ length: 90 }, (_, index) => 1 + index * 0.01);
    const metrics = calculateMetrics(buildSeries(values));
    const trend = analyzeTrend(buildSeries(values));

    expect(metrics.periodReturns.month1).toBeGreaterThan(0);
    expect(metrics.maxDrawdown).toBeLessThanOrEqual(0);
    expect(trend.shortTrend).toBe("走强");
  });
});

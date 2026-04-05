import { describe, expect, it } from "vitest";

import { analyzePortfolio } from "@/lib/analysis/portfolio";

describe("portfolio analysis", () => {
  it("triggers add position and take profit according to thresholds", () => {
    const addPosition = analyzePortfolio({
      buyCost: 1,
      investedAmount: 10000,
      holdingShares: 10000,
      currentNav: 0.94,
      totalCapital: 50000,
      fundPositionRatio: 0.2
    });
    expect(addPosition.addPositionTriggered).toBe(true);

    const takeProfit = analyzePortfolio({
      buyCost: 1,
      investedAmount: 10000,
      holdingShares: 10000,
      currentNav: 1.12,
      totalCapital: 50000,
      fundPositionRatio: 0.2
    });
    expect(takeProfit.takeProfitTriggered).toBe(true);
  });
});

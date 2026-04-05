import { describe, expect, it } from "vitest";

import { buildFundAnalysis } from "@/lib/analysis/strategy";
import type { FundOverview, MacroSnapshot, NavPoint } from "@/types/domain";

const overview: FundOverview = {
  code: "513100",
  name: "纳指ETF",
  type: "QDII-ETF",
  company: "国泰基金",
  manager: "指数团队",
  inceptionDate: "2013-04-25",
  theme: "海外科技",
  tags: ["全球配置"],
  styleExposure: "美股科技龙头",
  riskLevel: "中高",
  summary: "test",
  updatedAt: new Date().toISOString(),
  source: "test"
};

const macro: MacroSnapshot = {
  snapshotDate: "2026-04-05",
  riskAppetite: "中性",
  policyBias: "利率高位观察",
  inflationView: "通胀相对平稳",
  styleRotation: "成长与防守均衡",
  importantEvents: ["test"],
  summary: "test",
  updatedAt: new Date().toISOString()
};

function buildSeries(): NavPoint[] {
  return Array.from({ length: 220 }, (_, index) => ({
    code: "513100",
    date: new Date(2025, 0, index + 1).toISOString().slice(0, 10),
    nav: Number((1 + index * 0.003).toFixed(4))
  }));
}

describe("strategy", () => {
  it("generates explainable analysis output", () => {
    const analysis = buildFundAnalysis(overview, buildSeries(), [], macro);
    expect(analysis.score.totalScore).toBeGreaterThan(50);
    expect(analysis.decision.basis.length).toBeGreaterThan(2);
    expect(["适合买入", "持有", "继续观察"]).toContain(analysis.decision.status);
  });
});

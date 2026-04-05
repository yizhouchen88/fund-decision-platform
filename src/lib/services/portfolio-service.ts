import { analyzePortfolio, resolvePositionRiskLevel, summarizePortfolioCollection } from "@/lib/analysis/portfolio";
import { buildFundAnalysis } from "@/lib/analysis/strategy";
import { ensureFundData } from "@/lib/services/fund-service";
import { getInsights, getLatestMacroSnapshot } from "@/lib/services/repository";
import { round } from "@/lib/utils/math";
import type { PortfolioCollectionAnalysis, PortfolioHoldingAnalysis, PortfolioHoldingInput } from "@/types/domain";

export async function analyzePortfolioHoldings(
  rawHoldings: PortfolioHoldingInput[],
  totalCapital?: number
): Promise<PortfolioCollectionAnalysis> {
  const holdings = rawHoldings.filter(
    (item) => item.code && item.buyCost > 0 && item.holdingShares > 0
  );
  const macro = getLatestMacroSnapshot();
  const fallbackCapital = holdings.reduce((sum, item) => {
    const amount = item.investedAmount ?? item.buyCost * item.holdingShares;
    return sum + amount;
  }, 0);
  const baseCapital = totalCapital && totalCapital > 0 ? totalCapital : fallbackCapital;

  const enriched = await Promise.all(
    holdings.map(async (holding) => {
      const { overview, navSeries } = await ensureFundData(holding.code);
      const currentNav = holding.currentNav ?? overview.latestNav ?? navSeries.at(-1)?.nav ?? holding.buyCost;
      const investedAmount = holding.investedAmount ?? round(holding.buyCost * holding.holdingShares, 2);
      const marketValue = round(currentNav * holding.holdingShares, 2);
      const positionRatio = holding.fundPositionRatio ?? (baseCapital > 0 ? marketValue / baseCapital : 0);
      const single = analyzePortfolio({
        buyCost: holding.buyCost,
        investedAmount,
        holdingShares: holding.holdingShares,
        currentNav,
        totalCapital: baseCapital,
        fundPositionRatio: positionRatio
      });
      const news = [
        ...getInsights({ code: overview.code, contentType: "news", limit: 4 }),
        ...getInsights({ theme: overview.theme, contentType: "news", limit: 4 }),
        ...getInsights({ theme: overview.theme, contentType: "opinion", limit: 4 })
      ];
      const analysis = buildFundAnalysis(overview, navSeries, news, macro);

      let status: PortfolioHoldingAnalysis["status"] = "继续观察";
      let suggestedAction: PortfolioHoldingAnalysis["suggestedAction"] = "继续观察";

      if (analysis.decision.status === "谨慎卖出" || single.riskAlertTriggered) {
        status = "风险偏高";
        suggestedAction = "暂不操作";
      } else if (analysis.decision.status === "分批买入" || single.addPositionTriggered) {
        status = "适合分批加仓";
        suggestedAction = "分批加仓";
      } else if (analysis.decision.status === "持有") {
        status = "适合继续持有";
        suggestedAction = "继续持有";
      }

      const reasons = [
        ...analysis.decision.basis.slice(0, 2),
        ...single.suggestions.slice(0, 2)
      ].slice(0, 4);

      return {
        code: overview.code,
        name: holding.name || overview.name,
        type: overview.type,
        theme: overview.theme,
        buyCost: holding.buyCost,
        holdingShares: holding.holdingShares,
        currentNav,
        investedAmount,
        marketValue,
        floatingPnL: single.floatingPnL,
        returnRate: single.returnRate,
        positionRatio: round(positionRatio, 4),
        positionRiskLevel: resolvePositionRiskLevel(positionRatio),
        status,
        suggestedAction,
        addPositionTriggered: single.addPositionTriggered,
        takeProfitTriggered: single.takeProfitTriggered,
        riskAlertTriggered: single.riskAlertTriggered,
        reasons,
        riskWarnings:
          analysis.decision.riskWarnings.length > 0
            ? analysis.decision.riskWarnings
            : ["当前未触发额外风险警报，但仍需关注仓位集中度。"],
        longTermFit: analysis.decision.suitableForSip || analysis.decision.allocationRole === "核心仓",
        lastUpdatedAt: overview.updatedAt
      } satisfies PortfolioHoldingAnalysis;
    })
  );

  return {
    holdings: enriched.sort((a, b) => b.positionRatio - a.positionRatio),
    summary: summarizePortfolioCollection(enriched)
  };
}

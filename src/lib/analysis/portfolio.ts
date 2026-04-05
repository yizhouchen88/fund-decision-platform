import { clamp, round } from "@/lib/utils/math";
import type { PortfolioAnalysis, PortfolioInput } from "@/types/domain";

export function analyzePortfolio(input: PortfolioInput): PortfolioAnalysis {
  const marketValue = input.holdingShares * input.currentNav;
  const floatingPnL = marketValue - input.investedAmount;
  const returnRate = input.investedAmount > 0 ? floatingPnL / input.investedAmount : 0;
  const stopDrawdownThreshold = input.stopDrawdownThreshold ?? 0.08;
  const positionRatio = clamp(input.fundPositionRatio, 0, 1);

  let positionRiskLevel: PortfolioAnalysis["positionRiskLevel"] = "低";
  if (positionRatio >= 0.3) {
    positionRiskLevel = "高";
  } else if (positionRatio >= 0.15) {
    positionRiskLevel = "中";
  }

  const addPositionTriggered =
    input.currentNav <= input.buyCost * 0.95 && positionRatio <= 0.25 && returnRate > -0.25;
  const takeProfitTriggered = returnRate >= 0.1;
  const riskAlertTriggered =
    returnRate <= -stopDrawdownThreshold || positionRiskLevel === "高";

  const suggestions: string[] = [];

  if (addPositionTriggered) {
    const batches = Math.max(1, Math.floor(Math.abs(input.currentNav / input.buyCost - 1) / 0.05));
    suggestions.push(`当前相对买入成本已回撤约 ${(Math.abs(input.currentNav / input.buyCost - 1) * 100).toFixed(2)}%，可考虑第 ${batches} 档分批加仓。`);
  } else {
    suggestions.push("未触发分批加仓条件，优先等待更明确的回撤区间或趋势企稳信号。");
  }

  if (takeProfitTriggered) {
    suggestions.push("收益率已达到分批止盈观察区，建议结合趋势与总仓位逐步兑现，而不是一次性清仓。");
  } else {
    suggestions.push("尚未达到默认的 10% 分批止盈阈值，继续观察趋势延续性。");
  }

  if (positionRiskLevel === "高") {
    suggestions.push("单只基金仓位偏高，建议评估再平衡和组合分散。");
  } else {
    suggestions.push("当前仓位未明显失衡，但仍应控制单一主题的集中暴露。");
  }

  if (riskAlertTriggered) {
    suggestions.push("已触发风险警戒，若趋势继续恶化应优先控制回撤。");
  }

  const estimatedDrawdownRisk =
    positionRiskLevel === "高" || returnRate <= -0.08
      ? "高"
      : positionRiskLevel === "中" || returnRate <= -0.03
        ? "中"
        : "低";

  return {
    floatingPnL: round(floatingPnL, 2),
    returnRate: round(returnRate, 4),
    estimatedDrawdownRisk,
    positionRiskLevel,
    addPositionTriggered,
    takeProfitTriggered,
    riskAlertTriggered,
    suggestions
  };
}

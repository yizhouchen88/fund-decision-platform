import { clamp, round } from "@/lib/utils/math";
import type {
  PortfolioAnalysis,
  PortfolioCollectionAnalysis,
  PortfolioHoldingAnalysis,
  PortfolioInput
} from "@/types/domain";

export function resolvePositionRiskLevel(positionRatio: number): PortfolioAnalysis["positionRiskLevel"] {
  if (positionRatio >= 0.3) {
    return "高";
  }

  if (positionRatio >= 0.15) {
    return "中";
  }

  return "低";
}

export function analyzePortfolio(input: PortfolioInput): PortfolioAnalysis {
  const marketValue = input.holdingShares * input.currentNav;
  const floatingPnL = marketValue - input.investedAmount;
  const returnRate = input.investedAmount > 0 ? floatingPnL / input.investedAmount : 0;
  const stopDrawdownThreshold = input.stopDrawdownThreshold ?? 0.08;
  const positionRatio = clamp(input.fundPositionRatio, 0, 1);
  const positionRiskLevel = resolvePositionRiskLevel(positionRatio);

  const addPositionTriggered =
    input.currentNav <= input.buyCost * 0.95 && positionRatio <= 0.25 && returnRate > -0.25;
  const takeProfitTriggered = returnRate >= 0.1;
  const riskAlertTriggered =
    returnRate <= -stopDrawdownThreshold || positionRiskLevel === "高";

  const suggestions: string[] = [];

  if (addPositionTriggered) {
    const batches = Math.max(1, Math.floor(Math.abs(input.currentNav / input.buyCost - 1) / 0.05));
    suggestions.push(
      `当前相对买入成本已回撤约 ${(Math.abs(input.currentNav / input.buyCost - 1) * 100).toFixed(2)}%，可考虑第 ${batches} 档分批加仓。`
    );
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

export function summarizePortfolioCollection(
  holdings: PortfolioHoldingAnalysis[]
): PortfolioCollectionAnalysis["summary"] {
  const totalInvested = round(holdings.reduce((sum, item) => sum + item.investedAmount, 0), 2);
  const totalMarketValue = round(holdings.reduce((sum, item) => sum + item.marketValue, 0), 2);
  const floatingPnL = round(totalMarketValue - totalInvested, 2);
  const returnRate = totalInvested > 0 ? round(floatingPnL / totalInvested, 4) : 0;
  const totalRiskWeight = holdings.reduce((sum, item) => {
    return sum + (item.positionRiskLevel === "高" ? 1.5 : item.positionRiskLevel === "中" ? 1 : 0.4);
  }, 0);
  const averageRiskWeight = holdings.length > 0 ? totalRiskWeight / holdings.length : 0;
  const maxPosition = holdings.reduce((max, item) => Math.max(max, item.positionRatio), 0);
  const topTwoWeight = holdings
    .map((item) => item.positionRatio)
    .sort((a, b) => b - a)
    .slice(0, 2)
    .reduce((sum, value) => sum + value, 0);

  const overallStyle =
    averageRiskWeight >= 1.15 ? "偏进攻" : averageRiskWeight <= 0.75 ? "偏防守" : "均衡";
  const concentrationRisk =
    maxPosition >= 0.35 || topTwoWeight >= 0.6 ? "高" : maxPosition >= 0.22 || topTwoWeight >= 0.45 ? "中" : "低";

  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (concentrationRisk === "高") {
    warnings.push("组合集中度偏高，单一基金或单一主题暴露可能放大回撤。");
  }

  if (overallStyle === "偏进攻") {
    warnings.push("组合当前偏进攻，若市场风险偏好转弱，波动可能放大。");
  }

  if (holdings.some((item) => item.status === "风险偏高")) {
    warnings.push("组合中存在风险偏高的持仓，建议优先观察趋势与消息面是否继续恶化。");
  }

  suggestions.push(
    concentrationRisk === "高"
      ? "优先处理集中度问题，再考虑是否继续加仓。"
      : "集中度尚可，可以把精力放在分批节奏和主题平衡上。"
  );
  suggestions.push(
    overallStyle === "偏防守"
      ? "当前更偏防守配置，若你希望提高弹性，应逐步而不是集中切换。"
      : overallStyle === "偏进攻"
        ? "组合进攻属性较强，更要控制单一主题仓位和补仓节奏。"
        : "组合风格相对均衡，关键在于维持纪律而不是频繁切换。"
  );

  const coreHoldings = holdings.filter((item) => item.longTermFit).map((item) => item.name);
  const watchlist = holdings
    .filter((item) => ["继续观察", "风险偏高"].includes(item.status))
    .map((item) => item.name);

  return {
    totalInvested,
    totalMarketValue,
    floatingPnL,
    returnRate,
    overallStyle,
    concentrationRisk,
    watchlist,
    coreHoldings,
    warnings,
    suggestions
  };
}

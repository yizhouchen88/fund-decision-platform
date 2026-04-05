import { differenceInCalendarDays } from "date-fns";

import { analyzeRisk, analyzeTrend, calculateMetrics, periodReturn } from "@/lib/analysis/indicators";
import { clamp, round } from "@/lib/utils/math";
import type {
  FundOverview,
  MacroSnapshot,
  NavPoint,
  NewsItem,
  ScoreBreakdown,
  StrategyDecision
} from "@/types/domain";

function themeBaseScore(theme: string) {
  const mapping: Record<string, number> = {
    人工智能: 13,
    医疗健康: 13,
    创新药: 12,
    高端制造: 12,
    全球优质资产: 14,
    宽基指数: 15,
    红利低波: 14,
    海外科技: 13,
    海外资产: 12,
    能源: 10,
    消费: 10
  };

  return mapping[theme] ?? 9;
}

function allocationBaseScore(overview: FundOverview) {
  if (["宽基指数", "红利低波", "全球优质资产"].includes(overview.theme)) {
    return 18;
  }

  if (["医疗健康", "海外科技", "高端制造"].includes(overview.theme)) {
    return 13;
  }

  return overview.riskLevel === "高" ? 9 : 12;
}

function newsSentimentFactor(newsItems: NewsItem[]) {
  if (newsItems.length === 0) {
    return {
      score: 5,
      bias: "新闻样本有限，情绪因子保持中性。"
    };
  }

  const weighted = newsItems.reduce(
    (sum, item) => sum + item.sentimentScore * item.weight,
    0
  );
  const normalized = clamp(5 + weighted * 4, 0, 10);

  if (normalized >= 6.5) {
    return {
      score: round(normalized, 2),
      bias: "新闻与观点情绪偏正面，但仍不能单独触发买卖决策。"
    };
  }

  if (normalized <= 3.5) {
    return {
      score: round(normalized, 2),
      bias: "新闻与观点情绪偏谨慎，需结合趋势确认。"
    };
  }

  return {
    score: round(normalized, 2),
    bias: "新闻与观点整体中性，对策略结论只作辅助。"
  };
}

export function buildFundAnalysis(
  overview: FundOverview,
  navSeries: NavPoint[],
  insights: NewsItem[],
  macro: MacroSnapshot
) {
  const metrics = calculateMetrics(navSeries);
  const trend = analyzeTrend(navSeries);
  const risk = analyzeRisk(navSeries);
  const values = navSeries.map((item) => item.nav);
  const recent5d = periodReturn(values, 5) ?? 0;
  const recent20d = periodReturn(values, 20) ?? 0;
  const sentiment = newsSentimentFactor(insights);
  const macroRiskOff = macro.riskAppetite.includes("谨慎");

  let trendScore = 5;
  if (trend.shortTrend === "走强") trendScore += 5;
  if (trend.midTrend === "走强") trendScore += 7;
  if (trend.alignment === "多头排列") trendScore += 3;
  if ((trend.rsi14 ?? 50) >= 45 && (trend.rsi14 ?? 50) <= 68) trendScore += 2;
  if (trend.midTrend === "走弱") trendScore -= 4;
  trendScore = clamp(trendScore, 0, 20);

  let riskScore = 15;
  if (metrics.volatility > 0.3) riskScore -= 5;
  if (metrics.maxDrawdown <= -0.25) riskScore -= 4;
  if (metrics.sharpe < 0) riskScore -= 3;
  if (overview.riskLevel === "高") riskScore -= 2;
  riskScore = clamp(riskScore, 0, 15);

  let themeScore = themeBaseScore(overview.theme);
  if (macroRiskOff && ["红利低波", "宽基指数", "全球优质资产"].includes(overview.theme)) {
    themeScore += 1;
  }
  if (macroRiskOff && ["人工智能", "高端制造", "海外科技"].includes(overview.theme)) {
    themeScore -= 1;
  }
  themeScore = clamp(themeScore, 0, 15);

  let momentumScore = 5;
  if ((metrics.periodReturns.month3 ?? 0) > 0) momentumScore += 2;
  if ((metrics.periodReturns.month6 ?? 0) > 0) momentumScore += 2;
  if ((metrics.periodReturns.year1 ?? 0) > 0) momentumScore += 2;
  if ((metrics.periodReturns.month1 ?? 0) > 0.12) momentumScore -= 2;
  if ((metrics.periodReturns.month1 ?? 0) < -0.08) momentumScore -= 2;
  momentumScore = clamp(momentumScore, 0, 10);

  let drawdownControlScore = 4;
  if (trend.drawdownFromHigh <= -0.05 && trend.drawdownFromHigh > -0.15) {
    drawdownControlScore += 4;
  } else if (trend.drawdownFromHigh <= -0.15 && trend.drawdownFromHigh > -0.25) {
    drawdownControlScore += 2;
  } else if (trend.drawdownFromHigh > -0.03) {
    drawdownControlScore -= 2;
  }
  if (recent5d <= -0.08) {
    drawdownControlScore -= 2;
  }
  drawdownControlScore = clamp(drawdownControlScore, 0, 10);

  const allocationFitScore = clamp(allocationBaseScore(overview), 0, 20);
  const newsSentimentScore = clamp(sentiment.score, 0, 10);
  const totalScore = round(
    trendScore +
      riskScore +
      themeScore +
      momentumScore +
      drawdownControlScore +
      newsSentimentScore +
      allocationFitScore,
    2
  );

  const score: ScoreBreakdown = {
    trendScore,
    riskScore,
    themeScore,
    momentumScore,
    drawdownControlScore,
    newsSentimentScore,
    allocationFitScore,
    totalScore
  };

  const basis: string[] = [];
  if (trend.alignment === "多头排列") {
    basis.push("均线呈多头排列，中期趋势相对完整。");
  } else if (trend.alignment === "空头排列") {
    basis.push("均线偏空头排列，趋势修复仍需时间。");
  } else {
    basis.push("均线结构处于混合状态，适合结合回撤区间分批判断。");
  }

  if (trend.drawdownFromHigh <= -0.05) {
    const batches = Math.max(1, Math.floor(Math.abs(trend.drawdownFromHigh) / 0.05));
    basis.push(`从阶段高点回撤约 ${Math.abs(trend.drawdownFromHigh * 100).toFixed(1)}%，已进入第 ${batches} 档分批观察区。`);
  } else {
    basis.push("距离阶段高点不远，若追高买入需注意性价比。");
  }

  basis.push(`主题方向属于“${overview.theme}”，长期逻辑评分为 ${themeScore}/15。`);
  basis.push(sentiment.bias);

  if (metrics.sharpe > 0) {
    basis.push(`近阶段风险收益比尚可，夏普比率约 ${metrics.sharpe.toFixed(2)}。`);
  } else {
    basis.push("近阶段风险收益比偏弱，宜更重视节奏与仓位控制。");
  }

  let status: StrategyDecision["status"] = "继续观察";
  const riskWarnings = [...risk.warnings];

  if (
    trend.drawdownFromHigh <= -0.05 &&
    trend.drawdownFromHigh > -0.2 &&
    trend.midTrend !== "走弱" &&
    recent5d > -0.08 &&
    totalScore >= 60
  ) {
    status = "分批买入";
  } else if (
    trend.midTrend === "走强" &&
    trend.alignment === "多头排列" &&
    trend.drawdownFromHigh > -0.05 &&
    totalScore >= 72
  ) {
    status = "持有";
  } else if (
    trend.midTrend === "走弱" &&
    trend.alignment === "空头排列" &&
    recent20d < -0.08 &&
    totalScore < 55
  ) {
    status = "谨慎卖出";
  } else if (
    trend.midTrend !== "走弱" &&
    trend.drawdownFromHigh <= -0.03 &&
    trend.drawdownFromHigh > -0.08 &&
    totalScore >= 68
  ) {
    status = "适合买入";
  }

  if (recent5d <= -0.08) {
    status = "继续观察";
    riskWarnings.push("短期跌势过陡，若准备加仓建议等待量价企稳。");
  }

  const suitableForSip = ["宽基指数", "红利低波", "全球优质资产"].includes(overview.theme);
  const allocationRole: StrategyDecision["allocationRole"] =
    totalScore < 60
      ? "观察仓"
      : suitableForSip || overview.riskLevel === "低" || overview.riskLevel === "中低"
        ? "核心仓"
        : "卫星仓";
  const holdPeriod: StrategyDecision["holdPeriod"] = suitableForSip ? "长期" : "中长期";

  const investorFit =
    allocationRole === "核心仓"
      ? "适合偏长期、重视纪律和回撤控制的投资者。"
      : allocationRole === "卫星仓"
        ? "适合能承受中高波动、愿意分批布局主题机会的投资者。"
        : "适合先观察，不急于在单一位置重仓下注。";

  return {
    metrics,
    trend,
    risk,
    score,
    decision: {
      status,
      basis,
      riskWarnings,
      suitableForSip,
      allocationRole,
      holdPeriod,
      investorFit
    } satisfies StrategyDecision,
    recommendationReasons: [
      `${overview.name} 总分 ${totalScore}/100，趋势分 ${trendScore}/20，风险分 ${riskScore}/15。`,
      `近1年收益 ${((metrics.periodReturns.year1 ?? 0) * 100).toFixed(2)}%，最大回撤 ${Math.abs(metrics.maxDrawdown * 100).toFixed(2)}%。`,
      `当前状态为“${status}”，核心依据包括回撤区间、均线结构和主题长期逻辑。`
    ]
  };
}

export function summarizeInsightTimeliness(items: NewsItem[]) {
  if (items.length === 0) {
    return "暂无新近资讯，新闻辅助因子维持中性。";
  }

  const latest = items
    .map((item) => differenceInCalendarDays(new Date(), new Date(item.publishedAt)))
    .sort((a, b) => a - b)[0];

  if (latest <= 2) {
    return "近两天有更新资讯，情绪影响仍在观察窗口内。";
  }

  return "最近资讯相对偏旧，交易层面的参考权重应下降。";
}

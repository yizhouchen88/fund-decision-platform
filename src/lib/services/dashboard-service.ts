import { hotThemeMeta } from "@/lib/data/seed-data";
import { buildRecommendations } from "@/lib/services/recommendation-service";
import {
  getFundOverview,
  getLatestFundScore,
  getLatestMacroSnapshot,
  getLatestRecommendations,
  getSystemState
} from "@/lib/services/repository";
import type { DashboardData, RecommendationItem } from "@/types/domain";

export function getDashboardData(): DashboardData {
  const items = getRecommendationData();
  const lastRefresh = getSystemState("last_refresh_at");

  const focusFunds = items.filter((item) => item.bucket === "今日重点观察").slice(0, 4);
  const latestSignals = (
    items.filter((item) => ["适合买入", "分批买入", "谨慎卖出"].includes(item.decision)).length > 0
      ? items.filter((item) => ["适合买入", "分批买入", "谨慎卖出"].includes(item.decision))
      : items.sort((a, b) => b.score.totalScore - a.score.totalScore)
  ).slice(0, 6);

  return {
    lastUpdatedAt: lastRefresh?.value ?? new Date().toISOString(),
    riskNotice:
      "本平台仅提供长期投资研究与辅助决策，不承诺收益，不构成任何个性化投资建议。",
    focusFunds,
    latestSignals,
    macro: getLatestMacroSnapshot(),
    hotThemes: hotThemeMeta
  };
}

export function getRecommendationData(): RecommendationItem[] {
  const records = getLatestRecommendations();
  if (records.length === 0) {
    return buildRecommendations().items;
  }

  const items: RecommendationItem[] = [];
  for (const record of records) {
    const overview = getFundOverview(record.code);
    const score = getLatestFundScore(record.code);
    if (!overview || !score) {
      continue;
    }

    items.push({
      bucket: record.bucket,
      code: overview.code,
      name: overview.name,
      theme: overview.theme,
      latestNav: overview.latestNav,
      latestNavDate: overview.latestNavDate,
      score: {
        trendScore: score.trend_score,
        riskScore: score.risk_score,
        themeScore: score.theme_score,
        momentumScore: score.momentum_score,
        drawdownControlScore: score.drawdown_control_score,
        newsSentimentScore: score.news_sentiment_score,
        allocationFitScore: score.allocation_fit_score,
        totalScore: score.total_score
      },
      reasons: JSON.parse(record.reason),
      decision: score.decision as RecommendationItem["decision"]
    });
  }

  return items;
}

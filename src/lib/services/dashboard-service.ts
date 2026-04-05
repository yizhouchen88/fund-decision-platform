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

  const focusFunds = items
    .filter((item) => ["红色区域：现在适合买", "适合分批买入"].includes(item.bucket))
    .slice(0, 4);
  const latestSignals = (
    items.filter((item) => ["红色区域：现在适合买", "谨慎 / 风险偏高"].includes(item.bucket)).length > 0
      ? items.filter((item) => ["红色区域：现在适合买", "谨慎 / 风险偏高"].includes(item.bucket))
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

    const payload = JSON.parse(record.reason) as
      | {
          reasons?: string[];
          riskWarnings?: string[];
          suggestedAction?: RecommendationItem["suggestedAction"];
          messageImpact?: string;
          type?: string;
          updatedAt?: string;
        }
      | string[];
    const reasons = Array.isArray(payload) ? payload : payload.reasons ?? [];

    items.push({
      bucket: record.bucket,
      code: overview.code,
      name: overview.name,
      type: overview.type,
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
      reasons,
      riskWarnings: Array.isArray(payload) ? [] : payload.riskWarnings ?? [],
      decision: score.decision as RecommendationItem["decision"],
      suggestedAction: Array.isArray(payload) ? "继续观察" : payload.suggestedAction ?? "继续观察",
      messageImpact:
        Array.isArray(payload) ? "消息面对判断维持中性。" : payload.messageImpact ?? "消息面对判断维持中性。",
      updatedAt: Array.isArray(payload) ? overview.updatedAt : payload.updatedAt ?? overview.updatedAt
    });
  }

  return items;
}

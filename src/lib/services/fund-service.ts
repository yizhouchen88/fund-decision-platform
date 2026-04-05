import { differenceInHours } from "date-fns";

import { buildFundAnalysis, summarizeInsightTimeliness } from "@/lib/analysis/strategy";
import { generateFallbackNavSeries } from "@/lib/data/fallback-nav";
import { trackedFundSeeds } from "@/lib/data/seed-data";
import { fetchFundBundle, searchFundsRemote } from "@/lib/providers/eastmoney";
import {
  getFundOverview,
  getInsights,
  getLatestMacroSnapshot,
  getLatestFundScore,
  getNavSeries,
  replaceNavSeries,
  searchFundsLocal,
  upsertFund
} from "@/lib/services/repository";
import { log } from "@/lib/utils/logger";
import type { FundDetail, FundOverview } from "@/types/domain";

function defaultOverview(code: string): FundOverview {
  const seed = trackedFundSeeds.find((item) => item.code === code);
  const now = new Date().toISOString();

  if (seed) {
    return {
      ...seed,
      updatedAt: now,
      source: "seed"
    };
  }

  return {
    code,
    name: `基金 ${code}`,
    type: "基金",
    company: "待补充",
    manager: "待补充",
    inceptionDate: "2000-01-01",
    theme: "其他",
    tags: ["待补充"],
    styleExposure: "待补充",
    riskLevel: "中",
    summary: "当前以示例数据兜底，请在数据同步成功后查看更完整信息。",
    updatedAt: now,
    source: "fallback"
  };
}

function isStale(updatedAt: string, maxAgeHours = 12) {
  return differenceInHours(new Date(), new Date(updatedAt)) >= maxAgeHours;
}

export async function syncFund(code: string) {
  try {
    const bundle = await fetchFundBundle(code);
    const overview = {
      ...defaultOverview(code),
      ...bundle.overview,
      code,
      updatedAt: new Date().toISOString(),
      source: "eastmoney"
    } satisfies FundOverview;

    const navSeries =
      bundle.navSeries.length >= 60 ? bundle.navSeries : generateFallbackNavSeries(overview);

    upsertFund({
      ...overview,
      latestNav: navSeries.at(-1)?.nav,
      latestNavDate: navSeries.at(-1)?.date
    });
    replaceNavSeries(code, navSeries);

    return {
      overview,
      navSeries
    };
  } catch (error) {
    log("warn", "fund-service", `同步基金 ${code} 失败，切换兜底数据`, error);
    const overview = getFundOverview(code) ?? defaultOverview(code);
    const navSeries = getNavSeries(code);

    if (navSeries.length > 30) {
      return {
        overview,
        navSeries
      };
    }

    const fallbackSeries = generateFallbackNavSeries(overview);
    upsertFund({
      ...overview,
      latestNav: fallbackSeries.at(-1)?.nav,
      latestNavDate: fallbackSeries.at(-1)?.date,
      updatedAt: new Date().toISOString(),
      source: overview.source === "eastmoney" ? "eastmoney-fallback" : overview.source
    });
    replaceNavSeries(code, fallbackSeries);

    return {
      overview: getFundOverview(code) ?? overview,
      navSeries: fallbackSeries
    };
  }
}

export async function ensureFundData(code: string, options?: { force?: boolean }) {
  const existingOverview = getFundOverview(code);
  const existingNavSeries = getNavSeries(code);

  if (
    !options?.force &&
    existingOverview &&
    !isStale(existingOverview.updatedAt) &&
    existingNavSeries.length >= 60
  ) {
    return {
      overview: existingOverview,
      navSeries: existingNavSeries
    };
  }

  return syncFund(code);
}

export async function getFundDetail(code: string): Promise<FundDetail> {
  const { overview, navSeries } = await ensureFundData(code);
  const macro = getLatestMacroSnapshot();
  const codeNews = getInsights({ code, contentType: "news", limit: 6 });
  const themeNews = getInsights({ theme: overview.theme, contentType: "news", limit: 6 });
  const opinions = getInsights({ theme: overview.theme, contentType: "opinion", limit: 6 });
  const mergedNews = [...codeNews, ...themeNews]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((item, index, arr) => arr.findIndex((entry) => entry.url === item.url) === index)
    .slice(0, 8);
  const analysis = buildFundAnalysis(overview, navSeries, [...mergedNews, ...opinions], macro);
  const scoreRow = getLatestFundScore(code);

  return {
    overview,
    navSeries,
    metrics: analysis.metrics,
    trend: analysis.trend,
    risk: analysis.risk,
    decision: {
      ...analysis.decision,
      basis: [...analysis.decision.basis, summarizeInsightTimeliness(mergedNews)]
    },
    score: scoreRow
      ? {
          trendScore: scoreRow.trend_score,
          riskScore: scoreRow.risk_score,
          themeScore: scoreRow.theme_score,
          momentumScore: scoreRow.momentum_score,
          drawdownControlScore: scoreRow.drawdown_control_score,
          newsSentimentScore: scoreRow.news_sentiment_score,
          allocationFitScore: scoreRow.allocation_fit_score,
          totalScore: scoreRow.total_score
        }
      : analysis.score,
    news: mergedNews,
    opinions,
    recommendationReasons: analysis.recommendationReasons,
    lastUpdatedAt: overview.updatedAt
  };
}

export async function searchFunds(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const local = searchFundsLocal(trimmed);
  const merged = new Map<string, FundOverview>();
  for (const item of local) {
    merged.set(item.code, item);
  }

  if (trimmed.length >= 2 || /^\d{6}$/.test(trimmed)) {
    try {
      const remote = await searchFundsRemote(trimmed, 12);
      for (const item of remote) {
        if (!merged.has(item.code)) {
          merged.set(item.code, {
            ...defaultOverview(item.code),
            name: item.name,
            type: item.type,
            updatedAt: new Date().toISOString(),
            source: "eastmoney-search"
          });
        }
      }
    } catch (error) {
      log("warn", "fund-service", "远程搜索失败，继续返回本地结果", error);
    }
  }

  if (/^\d{6}$/.test(trimmed) && !local.some((item) => item.code === trimmed)) {
    await ensureFundData(trimmed);
    const synced = getFundOverview(trimmed);
    if (synced) {
      merged.set(trimmed, synced);
    }
  }

  return Array.from(merged.values()).slice(0, 12);
}

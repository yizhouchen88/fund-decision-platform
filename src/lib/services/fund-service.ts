import { differenceInHours } from "date-fns";

import { cleanNavSeries } from "@/lib/analysis/nav";
import { buildFundAnalysis, summarizeInsightTimeliness } from "@/lib/analysis/strategy";
import { generateFallbackNavSeries } from "@/lib/data/fallback-nav";
import { trackedFundSeeds } from "@/lib/data/seed-data";
import { fetchFundBundle, searchFundsRemote, type FundSearchEntry } from "@/lib/providers/eastmoney";
import {
  getAllFundOverviews,
  getFundOverview,
  getInsights,
  getLatestMacroSnapshot,
  getLatestFundScore,
  getNavSeries,
  replaceNavSeries,
  upsertFund
} from "@/lib/services/repository";
import { log } from "@/lib/utils/logger";
import type { FundDetail, FundOverview, FundSearchResult } from "@/types/domain";

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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function tokenize(query: string) {
  const normalized = normalizeText(query);
  const pieces = query
    .trim()
    .split(/[\s/|,，、]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set([normalized, ...pieces]));
}

function scoreTextContains(haystack: string, token: string, exact = 24, partial = 12) {
  if (!haystack || !token) {
    return 0;
  }

  if (haystack === token) {
    return exact;
  }

  if (haystack.startsWith(token)) {
    return partial + 6;
  }

  if (haystack.includes(token)) {
    return partial;
  }

  return 0;
}

function scoreOverviewMatch(query: string, overview: FundOverview) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenize(query);
  let score = 0;
  let matchReason = "名称与主题相关";

  if (overview.code === query.trim()) {
    score += 160;
    matchReason = "基金代码精确匹配";
  } else if (overview.code.startsWith(query.trim())) {
    score += 105;
    matchReason = "基金代码前缀匹配";
  } else if (overview.code.includes(query.trim())) {
    score += 72;
    matchReason = "基金代码相关匹配";
  }

  const name = normalizeText(overview.name);
  const theme = normalizeText(overview.theme);
  const type = normalizeText(overview.type);
  const tags = overview.tags.map((item) => normalizeText(item));
  const summary = normalizeText(`${overview.summary} ${overview.styleExposure} ${overview.company} ${overview.manager}`);

  score += scoreTextContains(name, normalizedQuery, 125, 76);
  score += scoreTextContains(theme, normalizedQuery, 46, 32);
  score += scoreTextContains(type, normalizedQuery, 34, 24);

  for (const token of tokens) {
    if (tags.some((item) => item.includes(token))) {
      score += 16;
      matchReason = matchReason === "名称与主题相关" ? "标签或主题匹配" : matchReason;
    }

    if (summary.includes(token)) {
      score += 10;
      matchReason = matchReason === "名称与主题相关" ? "摘要或风格描述匹配" : matchReason;
    }
  }

  if (name === normalizedQuery) {
    matchReason = "基金名称精确匹配";
  } else if (name.includes(normalizedQuery)) {
    matchReason = "基金名称模糊匹配";
  } else if (theme.includes(normalizedQuery) || tags.some((item) => item.includes(normalizedQuery))) {
    matchReason = "主题关键词匹配";
  }

  if (overview.latestNav) {
    score += 4;
  }

  if (overview.source.startsWith("eastmoney")) {
    score += 3;
  }

  return {
    score,
    matchReason
  };
}

function scoreRemoteMatch(query: string, entry: FundSearchEntry) {
  const normalizedQuery = normalizeText(query);
  let score = 0;
  let matchReason = "远程名称匹配";

  if (entry.code === query.trim()) {
    score += 150;
    matchReason = "基金代码精确匹配";
  } else if (entry.code.startsWith(query.trim())) {
    score += 98;
    matchReason = "基金代码前缀匹配";
  }

  const name = normalizeText(entry.name);
  const type = normalizeText(entry.type);
  const pinyin = normalizeText(`${entry.pinyin} ${entry.fullPinyin}`);

  score += scoreTextContains(name, normalizedQuery, 112, 68);
  score += scoreTextContains(type, normalizedQuery, 26, 18);

  if (/^[a-z]+$/i.test(normalizedQuery)) {
    score += scoreTextContains(pinyin, normalizedQuery, 72, 38);
    if (pinyin.includes(normalizedQuery)) {
      matchReason = "拼音或简称匹配";
    }
  }

  if (name === normalizedQuery) {
    matchReason = "基金名称精确匹配";
  } else if (name.includes(normalizedQuery)) {
    matchReason = "基金名称模糊匹配";
  }

  return {
    score,
    matchReason
  };
}

function toSearchResult(
  overview: FundOverview,
  score: number,
  matchReason: string,
  hasLocalData: boolean
): FundSearchResult {
  return {
    ...overview,
    relevanceScore: score,
    matchReason,
    hasLocalData,
    canViewDetail: /^\d{6}$/.test(overview.code)
  };
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

    const navSeries = cleanNavSeries(
      code,
      bundle.navSeries.length >= 60 ? bundle.navSeries : generateFallbackNavSeries(overview)
    );

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
    const navSeries = cleanNavSeries(code, getNavSeries(code));

    if (navSeries.length > 30) {
      return {
        overview,
        navSeries
      };
    }

    const fallbackSeries = cleanNavSeries(code, generateFallbackNavSeries(overview));
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
  const existingNavSeries = cleanNavSeries(code, getNavSeries(code));

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
  const cleanedSeries = cleanNavSeries(code, navSeries);
  const macro = getLatestMacroSnapshot();
  const codeNews = getInsights({ code, contentType: "news", limit: 6 });
  const themeNews = getInsights({ theme: overview.theme, contentType: "news", limit: 6 });
  const opinions = getInsights({ theme: overview.theme, contentType: "opinion", limit: 6 });
  const mergedNews = [...codeNews, ...themeNews]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((item, index, arr) => arr.findIndex((entry) => entry.url === item.url) === index)
    .slice(0, 8);
  const analysis = buildFundAnalysis(overview, cleanedSeries, [...mergedNews, ...opinions], macro);
  const scoreRow = getLatestFundScore(code);

  return {
    overview: {
      ...overview,
      latestNav: cleanedSeries.at(-1)?.nav ?? overview.latestNav,
      latestNavDate: cleanedSeries.at(-1)?.date ?? overview.latestNavDate
    },
    navSeries: cleanedSeries,
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

export async function searchFunds(query: string): Promise<FundSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const merged = new Map<string, FundSearchResult>();
  const localFunds = getAllFundOverviews();

  for (const overview of localFunds) {
    const matched = scoreOverviewMatch(trimmed, overview);
    if (matched.score <= 0) {
      continue;
    }

    merged.set(
      overview.code,
      toSearchResult(overview, matched.score, matched.matchReason, true)
    );
  }

  if (/^\d{6}$/.test(trimmed) && !merged.has(trimmed)) {
    await ensureFundData(trimmed);
    const synced = getFundOverview(trimmed);
    if (synced) {
      const matched = scoreOverviewMatch(trimmed, synced);
      merged.set(trimmed, toSearchResult(synced, matched.score, matched.matchReason, true));
    }
  }

  if (trimmed.length >= 2 || /^[a-z]+$/i.test(trimmed) || /^\d{4,6}$/.test(trimmed)) {
    try {
      const remote = await searchFundsRemote(trimmed, 30);
      for (const entry of remote) {
        const matched = scoreRemoteMatch(trimmed, entry);
        if (matched.score <= 0) {
          continue;
        }

        const existing = merged.get(entry.code);
        if (existing) {
          if (matched.score > existing.relevanceScore) {
            merged.set(entry.code, {
              ...existing,
              relevanceScore: matched.score,
              matchReason: matched.matchReason
            });
          }
          continue;
        }

        const seed = trackedFundSeeds.find((item) => item.code === entry.code);
        merged.set(
          entry.code,
          toSearchResult(
            {
              ...(seed ?? defaultOverview(entry.code)),
              code: entry.code,
              name: entry.name,
              type: entry.type || seed?.type || "基金",
              updatedAt: new Date().toISOString(),
              source: "eastmoney-search"
            },
            matched.score,
            matched.matchReason,
            false
          )
        );
      }
    } catch (error) {
      log("warn", "fund-service", "远程搜索失败，继续返回本地结果", error);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      if (Number(Boolean(b.hasLocalData)) !== Number(Boolean(a.hasLocalData))) {
        return Number(Boolean(b.hasLocalData)) - Number(Boolean(a.hasLocalData));
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 16);
}

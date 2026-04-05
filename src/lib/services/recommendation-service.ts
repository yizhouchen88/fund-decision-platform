import { periodReturn } from "@/lib/analysis/indicators";
import { buildFundAnalysis } from "@/lib/analysis/strategy";
import {
  getAllFundOverviews,
  getInsights,
  getLatestMacroSnapshot,
  getNavSeries,
  replaceRecommendations,
  saveFundScore
} from "@/lib/services/repository";
import type { FundBucket, RecommendationItem } from "@/types/domain";

function formatMessageImpact(score: number) {
  if (score >= 6.5) {
    return "近期消息面对判断略有加分，但仍需以趋势和回撤为主。";
  }

  if (score <= 3.5) {
    return "近期消息面对判断形成拖累，建议降低操作冲动，先看趋势修复。";
  }

  return "近期消息面整体中性，分类主要由趋势、回撤和风险指标决定。";
}

function classifyBucket(item: Omit<RecommendationItem, "bucket" | "suggestedAction" | "messageImpact">, recent5d: number) {
  const buyDecision = ["适合买入", "分批买入"].includes(item.decision);
  const trendStable =
    item.decision !== "谨慎卖出" &&
    item.score.trendScore >= 10 &&
    item.score.riskScore >= 8 &&
    item.score.drawdownControlScore >= 4;
  const redZoneReady =
    buyDecision &&
    trendStable &&
    item.score.totalScore >= 74 &&
    item.score.newsSentimentScore >= 4.5 &&
    item.score.riskScore >= 14 &&
    recent5d > -0.04;
  const batchBuyReady =
    buyDecision &&
    item.score.totalScore >= 60 &&
    item.score.riskScore >= 8 &&
    item.score.drawdownControlScore >= 4 &&
    recent5d > -0.08;
  const highRisk =
    item.decision === "谨慎卖出" ||
    item.score.riskScore <= 6 ||
    item.score.trendScore <= 7 ||
    item.score.newsSentimentScore <= 3.2;

  if (redZoneReady) {
    return {
      bucket: "红色区域：现在适合买" as FundBucket,
      suggestedAction: "分批买入" as const
    };
  }

  if (batchBuyReady) {
    return {
      bucket: "适合分批买入" as FundBucket,
      suggestedAction: "分批买入" as const
    };
  }

  if (highRisk) {
    return {
      bucket: "谨慎 / 风险偏高" as FundBucket,
      suggestedAction: "暂不操作" as const
    };
  }

  return {
    bucket: "继续观察" as FundBucket,
    suggestedAction: item.decision === "持有" ? ("继续持有" as const) : ("继续观察" as const)
  };
}

function bucketReasons(item: RecommendationItem) {
  const reasons = [...item.reasons];

  if (item.bucket === "红色区域：现在适合买") {
    reasons.unshift("当前更接近可开始分批买入的区间，但仍应拆成多笔执行，不追求一次性重仓。");
  }

  if (item.bucket === "适合分批买入") {
    reasons.unshift("已经进入可布局区间，但趋势和风险信号还不足以支持激进操作。");
  }

  if (item.bucket === "继续观察") {
    reasons.unshift("现在的核心动作不是追单，而是等待净值企稳、趋势确认或风险缓解。");
  }

  if (item.bucket === "谨慎 / 风险偏高") {
    reasons.unshift("当前不适合轻易加仓，优先关注风险来源是否缓解。");
  }

  return reasons.slice(0, 4);
}

export function buildRecommendations() {
  const macro = getLatestMacroSnapshot();
  const funds = getAllFundOverviews();
  const asOfDate = new Date().toISOString().slice(0, 10);
  const items: RecommendationItem[] = [];

  for (const overview of funds) {
    const navSeries = getNavSeries(overview.code);
    if (navSeries.length < 60) {
      continue;
    }

    const news = [
      ...getInsights({ code: overview.code, contentType: "news", limit: 4 }),
      ...getInsights({ theme: overview.theme, contentType: "news", limit: 4 }),
      ...getInsights({ theme: overview.theme, contentType: "opinion", limit: 4 })
    ];

    const analysis = buildFundAnalysis(overview, navSeries, news, macro);
    const recent5d = periodReturn(
      navSeries.map((item) => item.nav),
      5
    ) ?? 0;

    saveFundScore({
      code: overview.code,
      asOfDate,
      score: analysis.score,
      decision: analysis.decision.status,
      reasons: analysis.decision.basis
    });

    const preliminary: Omit<RecommendationItem, "bucket" | "suggestedAction" | "messageImpact"> = {
      code: overview.code,
      name: overview.name,
      type: overview.type,
      theme: overview.theme,
      score: analysis.score,
      latestNav: overview.latestNav,
      latestNavDate: overview.latestNavDate,
      reasons: analysis.recommendationReasons,
      riskWarnings:
        analysis.decision.riskWarnings.length > 0
          ? analysis.decision.riskWarnings
          : ["当前未触发额外风险警报，但仍需控制单只主题基金仓位。"],
      decision: analysis.decision.status,
      updatedAt: overview.updatedAt
    };

    const classification = classifyBucket(preliminary, recent5d);
    const item: RecommendationItem = {
      ...preliminary,
      bucket: classification.bucket,
      suggestedAction: classification.suggestedAction,
      messageImpact: formatMessageImpact(analysis.score.newsSentimentScore)
    };

    item.reasons = bucketReasons(item);
    items.push(item);
  }

  const bucketOrder: FundBucket[] = [
    "红色区域：现在适合买",
    "适合分批买入",
    "继续观察",
    "谨慎 / 风险偏高"
  ];

  const sorted = items.sort((a, b) => {
    const bucketGap = bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket);
    if (bucketGap !== 0) {
      return bucketGap;
    }

    return b.score.totalScore - a.score.totalScore;
  });

  replaceRecommendations(
    asOfDate,
    sorted.map((item) => ({
      bucket: item.bucket,
      code: item.code,
      score: item.score.totalScore,
      reason: JSON.stringify({
        reasons: item.reasons,
        riskWarnings: item.riskWarnings,
        suggestedAction: item.suggestedAction,
        messageImpact: item.messageImpact,
        type: item.type,
        updatedAt: item.updatedAt
      })
    }))
  );

  return {
    asOfDate,
    items: sorted
  };
}

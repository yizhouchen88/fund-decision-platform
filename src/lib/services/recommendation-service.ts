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

function uniqueByCode(items: RecommendationItem[]) {
  return items.filter((item, index, array) => array.findIndex((x) => x.code === item.code) === index);
}

function fallbackTop(
  primary: RecommendationItem[],
  source: RecommendationItem[],
  count: number,
  bucket: FundBucket
) {
  if (primary.length >= count) {
    return primary.slice(0, count);
  }

  const existingCodes = new Set(primary.map((item) => item.code));
  const supplemented = source
    .filter((item) => !existingCodes.has(item.code))
    .slice(0, count - primary.length)
    .map((item) => ({
      ...item,
      bucket
    }));

  return [...primary, ...supplemented];
}

function buildReasons(item: RecommendationItem, bucket: FundBucket) {
  const reasons = [...item.reasons];

  if (bucket === "今日重点观察") {
    reasons.push("处于重点观察区的原因是回撤进入可分批布局区间，同时长期逻辑未明显恶化。");
  }

  if (bucket === "防守型基金") {
    reasons.push("该基金更适合作为组合稳定器，不依赖短线情绪博弈。");
  }

  if (bucket === "进攻型基金") {
    reasons.push("进攻型类别强调趋势弹性，但默认只建议卫星仓分批参与。");
  }

  return reasons.slice(0, 4);
}

export function buildRecommendations() {
  const macro = getLatestMacroSnapshot();
  const funds = getAllFundOverviews();
  const items: RecommendationItem[] = [];
  const asOfDate = new Date().toISOString().slice(0, 10);

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
    saveFundScore({
      code: overview.code,
      asOfDate,
      score: analysis.score,
      decision: analysis.decision.status,
      reasons: analysis.decision.basis
    });

    items.push({
      bucket: "今日重点观察",
      code: overview.code,
      name: overview.name,
      theme: overview.theme,
      score: analysis.score,
      latestNav: overview.latestNav,
      latestNavDate: overview.latestNavDate,
      reasons: analysis.recommendationReasons,
      decision: analysis.decision.status
    });
  }

  const focus = uniqueByCode(
    fallbackTop(
      items
      .filter(
        (item) =>
          item.score.totalScore >= 60 &&
          item.decision !== "谨慎卖出" &&
          item.score.drawdownControlScore >= 6
      )
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        bucket: "今日重点观察" as const,
        reasons: buildReasons(item, "今日重点观察")
      })),
      items
        .filter((item) => item.decision !== "谨慎卖出")
        .sort((a, b) => b.score.totalScore - a.score.totalScore),
      5,
      "今日重点观察"
    )
  );

  const trend = uniqueByCode(
    fallbackTop(
      items
      .filter((item) => item.score.trendScore >= 14 && item.score.momentumScore >= 6)
      .sort(
        (a, b) =>
          b.score.trendScore + b.score.momentumScore - (a.score.trendScore + a.score.momentumScore)
      )
      .slice(0, 5)
      .map((item) => ({
        ...item,
        bucket: "当前趋势较优" as const,
        reasons: buildReasons(item, "当前趋势较优")
      })),
      items.sort((a, b) => b.score.trendScore + b.score.momentumScore - (a.score.trendScore + a.score.momentumScore)),
      5,
      "当前趋势较优"
    )
  );

  const longTerm = uniqueByCode(
    fallbackTop(
      items
      .filter(
        (item) =>
          item.score.themeScore >= 12 &&
          item.score.allocationFitScore >= 12 &&
          item.decision !== "谨慎卖出"
      )
      .sort((a, b) => b.score.themeScore + b.score.totalScore - (a.score.themeScore + a.score.totalScore))
      .slice(0, 6)
      .map((item) => ({
        ...item,
        bucket: "中长期布局方向" as const,
        reasons: buildReasons(item, "中长期布局方向")
      })),
      items.sort((a, b) => b.score.themeScore + b.score.allocationFitScore - (a.score.themeScore + a.score.allocationFitScore)),
      6,
      "中长期布局方向"
    )
  );

  const defensive = uniqueByCode(
    fallbackTop(
      items
      .filter((item) => ["红利低波", "宽基指数", "全球优质资产"].includes(item.theme))
      .sort((a, b) => b.score.riskScore + b.score.allocationFitScore - (a.score.riskScore + a.score.allocationFitScore))
      .slice(0, 5)
      .map((item) => ({
        ...item,
        bucket: "防守型基金" as const,
        reasons: buildReasons(item, "防守型基金")
      })),
      items.sort((a, b) => b.score.riskScore + b.score.allocationFitScore - (a.score.riskScore + a.score.allocationFitScore)),
      5,
      "防守型基金"
    )
  );

  const offensive = uniqueByCode(
    fallbackTop(
      items
      .filter((item) => ["人工智能", "高端制造", "海外科技", "创新药"].includes(item.theme))
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        bucket: "进攻型基金" as const,
        reasons: buildReasons(item, "进攻型基金")
      })),
      items.sort((a, b) => b.score.totalScore - a.score.totalScore),
      5,
      "进攻型基金"
    )
  );

  const overseas = uniqueByCode(
    fallbackTop(
      items
      .filter((item) => ["海外科技", "全球优质资产", "海外资产"].includes(item.theme))
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        bucket: "海外配置型基金" as const,
        reasons: buildReasons(item, "海外配置型基金")
      })),
      items.sort((a, b) => b.score.totalScore - a.score.totalScore),
      5,
      "海外配置型基金"
    )
  );

  const all = [...focus, ...trend, ...longTerm, ...defensive, ...offensive, ...overseas];

  replaceRecommendations(
    asOfDate,
    all.map((item) => ({
      bucket: item.bucket,
      code: item.code,
      score: item.score.totalScore,
      reason: JSON.stringify(item.reasons)
    }))
  );

  return {
    asOfDate,
    items: all
  };
}

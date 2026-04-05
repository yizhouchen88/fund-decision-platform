import { hotThemeMeta } from "@/lib/data/seed-data";
import { env } from "@/lib/env";
import { fetchMacroSnapshot } from "@/lib/providers/macro";
import {
  fetchFundNews,
  fetchMacroNews,
  fetchThemeNews,
  fetchThemeOpinions
} from "@/lib/providers/news";
import { buildRecommendations } from "@/lib/services/recommendation-service";
import {
  appendUpdateLog,
  getAllFundOverviews,
  upsertMacroSnapshot,
  upsertNewsItems,
  writeSystemState
} from "@/lib/services/repository";
import { ensureFundData } from "@/lib/services/fund-service";
import { log } from "@/lib/utils/logger";

export async function refreshAllData(options?: { force?: boolean }) {
  appendUpdateLog({
    taskName: "refresh_all",
    status: "started",
    message: "开始同步基金、资讯、宏观与推荐数据"
  });

  try {
    const fundCodes =
      getAllFundOverviews().map((item) => item.code).length > 0
        ? getAllFundOverviews().map((item) => item.code)
        : env.trackedFunds;

    for (const code of fundCodes) {
      await ensureFundData(code, { force: options?.force });
    }

    const allFunds = getAllFundOverviews();
    const themes = Array.from(new Set([...allFunds.map((item) => item.theme), ...hotThemeMeta.map((item) => item.theme)]));

    for (const fund of allFunds.slice(0, 10)) {
      try {
        const items = await fetchFundNews(fund.code, fund.name);
        upsertNewsItems(items);
      } catch (error) {
        log("warn", "update-service", `基金资讯同步失败: ${fund.code}`, error);
      }
    }

    for (const theme of themes) {
      try {
        const [news, opinions] = await Promise.all([
          fetchThemeNews(theme),
          fetchThemeOpinions(theme)
        ]);
        upsertNewsItems([...news, ...opinions]);
      } catch (error) {
        log("warn", "update-service", `主题资讯同步失败: ${theme}`, error);
      }
    }

    try {
      const macro = await fetchMacroSnapshot();
      upsertMacroSnapshot(macro);
    } catch (error) {
      log("warn", "update-service", "宏观数据同步失败，保留最近快照", error);
    }

    try {
      const macroNews = await fetchMacroNews();
      upsertNewsItems(macroNews);
    } catch (error) {
      log("warn", "update-service", "宏观资讯同步失败", error);
    }

    const recommendations = buildRecommendations();
    writeSystemState("last_refresh_at", new Date().toISOString());
    writeSystemState("last_recommendation_date", recommendations.asOfDate);

    appendUpdateLog({
      taskName: "refresh_all",
      status: "success",
      message: `同步完成，共生成 ${recommendations.items.length} 条推荐记录`
    });

    return {
      ok: true,
      count: recommendations.items.length
    };
  } catch (error) {
    appendUpdateLog({
      taskName: "refresh_all",
      status: "failed",
      message: "同步失败",
      details: error instanceof Error ? error.stack : String(error)
    });
    throw error;
  }
}

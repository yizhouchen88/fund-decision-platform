import vm from "node:vm";

import { trackedFundSeeds } from "@/lib/data/seed-data";
import { fetchText } from "@/lib/providers/http";
import type { FundOverview, NavPoint } from "@/types/domain";

type FundSearchEntry = {
  code: string;
  pinyin: string;
  name: string;
  type: string;
  fullPinyin: string;
};

type EastmoneyFundBundle = {
  overview: Partial<FundOverview>;
  navSeries: NavPoint[];
};

let searchCache:
  | {
      fetchedAt: number;
      data: FundSearchEntry[];
    }
  | undefined;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOverviewFromHtml(html: string) {
  const text = stripHtmlToText(html);
  const name = matchText(text, [/基金名称：\s*([^\s(]+)/, /^([^\s(]+)\(\d{6}\)/]);
  const type = matchText(text, [/类型：\s*([^：]+?)\s*规模：/]);
  const scale = matchText(text, [/规模：\s*([0-9.]+)亿元/]);
  const manager = matchText(text, [/基金经理：\s*([^\s]+?)\s*成\s*立\s*日/]);
  const inceptionDate = matchText(text, [/成\s*立\s*日：\s*(\d{4}-\d{2}-\d{2})/]);
  const company = matchText(text, [/管\s*理\s*人：\s*([^\s]+?)\s*(基金评级|跟踪标的|交易状态)/]);

  return {
    name,
    type,
    manager,
    company,
    inceptionDate,
    scale: scale ? Number(scale) * 100000000 : undefined
  };
}

function matchText(source: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const matched = source.match(pattern);
    if (matched?.[1]) {
      return matched[1].trim();
    }
  }

  return undefined;
}

function parseScriptBundle(script: string) {
  const sandbox: Record<string, unknown> = {
    console: {
      log() {
        return undefined;
      }
    }
  };
  sandbox.window = sandbox;

  vm.runInNewContext(script, sandbox, {
    timeout: 3000
  });

  return sandbox as Record<string, unknown>;
}

function normalizeNavSeries(
  code: string,
  netWorthTrend: unknown,
  accWorthTrend: unknown
): NavPoint[] {
  if (!Array.isArray(netWorthTrend)) {
    return [];
  }

  const accumulatedMap = new Map<string, number>();
  if (Array.isArray(accWorthTrend)) {
    for (const item of accWorthTrend) {
      if (Array.isArray(item) && item.length >= 2) {
        const date = new Date(Number(item[0])).toISOString().slice(0, 10);
        accumulatedMap.set(date, Number(item[1]));
      }
    }
  }

  const normalized: NavPoint[] = [];

  for (const item of netWorthTrend) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const raw = item as { x?: number; y?: number; equityReturn?: number | string };
      if (!raw.x || raw.y === undefined) {
        continue;
      }

      const date = new Date(Number(raw.x)).toISOString().slice(0, 10);
      const dailyReturn =
        raw.equityReturn === undefined || raw.equityReturn === null
          ? undefined
          : Number(raw.equityReturn) / 100;

      normalized.push({
        code,
        date,
        nav: Number(raw.y),
        accumulatedNav: accumulatedMap.get(date),
        dailyReturn
      });
  }

  return normalized.sort((a, b) => a.date.localeCompare(b.date));
}

export async function searchFundsRemote(query: string, limit = 15): Promise<FundSearchEntry[]> {
  if (!query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!searchCache || Date.now() - searchCache.fetchedAt > 12 * 60 * 60 * 1000) {
    const script = await fetchText("https://fund.eastmoney.com/js/fundcode_search.js");
    const matched = script.match(/=\s*(\[[\s\S]*\]);?$/);

    if (!matched?.[1]) {
      throw new Error("无法解析天天基金搜索索引");
    }

    const rows = JSON.parse(matched[1]) as [string, string, string, string, string][];
    searchCache = {
      fetchedAt: Date.now(),
      data: rows.map((row) => ({
        code: row[0],
        pinyin: row[1],
        name: row[2],
        type: row[3],
        fullPinyin: row[4]
      }))
    };
  }

  return searchCache.data
    .filter((item) => {
      const haystack = `${item.code} ${item.name} ${item.pinyin} ${item.fullPinyin}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export async function fetchFundBundle(code: string): Promise<EastmoneyFundBundle> {
  const [pageHtml, script] = await Promise.all([
    fetchText(`https://fund.eastmoney.com/${code}.html`),
    fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`)
  ]);

  const parsedPage = parseOverviewFromHtml(pageHtml);
  const sandbox = parseScriptBundle(script);
  const navSeries = normalizeNavSeries(
    code,
    sandbox.Data_netWorthTrend,
    sandbox.Data_ACWorthTrend
  );
  const fallbackSeed = trackedFundSeeds.find((item) => item.code === code);

  const latestPoint = navSeries.at(-1);

  return {
    overview: {
      code,
      name:
        parsedPage.name ??
        String(sandbox.fS_name ?? fallbackSeed?.name ?? code).replace(/\s+/g, ""),
      type: parsedPage.type ?? fallbackSeed?.type ?? "基金",
      company: parsedPage.company ?? fallbackSeed?.company ?? "待补充",
      manager: parsedPage.manager ?? fallbackSeed?.manager ?? "待补充",
      inceptionDate: parsedPage.inceptionDate ?? fallbackSeed?.inceptionDate ?? "2000-01-01",
      scale: parsedPage.scale ?? fallbackSeed?.scale,
      theme: fallbackSeed?.theme ?? "其他",
      tags: fallbackSeed?.tags ?? ["基金", "长期观察"],
      styleExposure: fallbackSeed?.styleExposure ?? "待补充",
      riskLevel: fallbackSeed?.riskLevel ?? "中",
      summary: fallbackSeed?.summary ?? "建议结合趋势、回撤与仓位管理综合判断。",
      latestNav: latestPoint?.nav,
      latestNavDate: latestPoint?.date,
      updatedAt: new Date().toISOString(),
      source: "eastmoney"
    },
    navSeries
  };
}

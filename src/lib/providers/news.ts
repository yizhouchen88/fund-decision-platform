import { differenceInCalendarDays } from "date-fns";
import { XMLParser } from "fast-xml-parser";

import { fetchText } from "@/lib/providers/http";
import type { NewsItem, SentimentLabel } from "@/types/domain";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const positiveKeywords = [
  "利好",
  "增长",
  "回暖",
  "修复",
  "创新",
  "突破",
  "超预期",
  "获批",
  "提振",
  "上调",
  "新高",
  "加速",
  "改善"
];

const negativeKeywords = [
  "利空",
  "下滑",
  "承压",
  "回撤",
  "风险",
  "不及预期",
  "亏损",
  "下调",
  "制裁",
  "波动",
  "监管",
  "恶化",
  "下跌"
];

function buildGoogleNewsUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
}

function summarizeTitle(title: string) {
  const cleanTitle = title.replace(/\s*-\s*[^-]+$/, "").trim();
  return `${cleanTitle}。新闻只能作为辅助因子，需与趋势、回撤和仓位管理结合判断。`;
}

function scoreSentiment(text: string) {
  const lower = text.toLowerCase();
  let score = 0;

  for (const keyword of positiveKeywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  for (const keyword of negativeKeywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score -= 1;
    }
  }

  return Math.max(-1, Math.min(1, score / 3));
}

function mapSentiment(score: number): SentimentLabel {
  if (score >= 0.2) {
    return "利好";
  }

  if (score <= -0.2) {
    return "利空";
  }

  return "中性";
}

function decayWeight(publishedAt: string) {
  const days = Math.max(0, differenceInCalendarDays(new Date(), new Date(publishedAt)));
  return Math.max(0.1, Number(Math.exp(-days / 7).toFixed(4)));
}

function normalizeItems(
  rawItems: unknown,
  relatedCode: string | undefined,
  relatedTheme: string | undefined,
  contentType: "news" | "opinion"
): NewsItem[] {
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const normalized: NewsItem[] = [];

  items.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const raw = item as {
        title?: string;
        link?: string;
        pubDate?: string;
        source?: string | { "#text"?: string };
      };
      if (!raw.title || !raw.link) {
        return;
      }

      const publishedAt = raw.pubDate ? new Date(raw.pubDate).toISOString() : new Date().toISOString();
      const sentimentScore = scoreSentiment(raw.title);
      const source =
        typeof raw.source === "string"
          ? raw.source
          : raw.source?.["#text"] ?? "Google News";

      normalized.push({
        id: `${contentType}-${relatedCode ?? relatedTheme ?? "global"}-${index}-${publishedAt}`,
        relatedCode,
        relatedTheme,
        title: raw.title.replace(/\s*-\s*[^-]+$/, "").trim(),
        summary: summarizeTitle(raw.title),
        source,
        url: raw.link,
        publishedAt,
        sentiment: mapSentiment(sentimentScore),
        sentimentScore,
        weight: decayWeight(publishedAt),
        contentType
      });
  });

  return normalized.slice(0, 8);
}

export async function fetchThemeNews(theme: string): Promise<NewsItem[]> {
  const xml = await fetchText(buildGoogleNewsUrl(`${theme} 基金 OR ETF 财经`));
  const payload = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };

  return normalizeItems(payload.rss?.channel?.item, undefined, theme, "news");
}

export async function fetchThemeOpinions(theme: string): Promise<NewsItem[]> {
  const xml = await fetchText(buildGoogleNewsUrl(`${theme} 券商 观点 OR 研报 OR 机构`));
  const payload = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };

  return normalizeItems(payload.rss?.channel?.item, undefined, theme, "opinion");
}

export async function fetchFundNews(code: string, name: string): Promise<NewsItem[]> {
  const xml = await fetchText(buildGoogleNewsUrl(`${name} ${code} 基金`));
  const payload = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };

  return normalizeItems(payload.rss?.channel?.item, code, undefined, "news");
}

export async function fetchMacroNews(): Promise<NewsItem[]> {
  const xml = await fetchText(buildGoogleNewsUrl("美联储 利率 通胀 科技 成长 红利 全球市场"));
  const payload = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };

  return normalizeItems(payload.rss?.channel?.item, undefined, "宏观", "news");
}

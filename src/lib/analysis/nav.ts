import { calculateDrawdownSeries, movingAverageSeries } from "@/lib/analysis/indicators";
import { round } from "@/lib/utils/math";
import type { NavPoint } from "@/types/domain";

function normalizeTradeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function cleanNavSeries(code: string, navSeries: NavPoint[]) {
  const deduped = new Map<string, NavPoint>();

  for (const point of navSeries) {
    const date = normalizeTradeDate(point.date);
    const nav = Number(point.nav);

    if (!date || !Number.isFinite(nav) || nav <= 0) {
      continue;
    }

    const accumulatedNav =
      point.accumulatedNav !== undefined && Number.isFinite(point.accumulatedNav) && point.accumulatedNav > 0
        ? Number(point.accumulatedNav)
        : undefined;

    const dailyReturn =
      point.dailyReturn !== undefined && Number.isFinite(point.dailyReturn)
        ? Number(point.dailyReturn)
        : undefined;

    deduped.set(date, {
      code,
      date,
      nav: round(nav, 4),
      accumulatedNav: accumulatedNav ? round(accumulatedNav, 4) : undefined,
      dailyReturn: dailyReturn !== undefined ? round(dailyReturn, 4) : undefined
    });
  }

  const sorted = Array.from(deduped.values()).sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((point, index) => {
    const previous = sorted[index - 1];
    const accumulatedNav = point.accumulatedNav ?? point.nav;
    const dailyReturn =
      point.dailyReturn !== undefined
        ? point.dailyReturn
        : previous
          ? round(point.nav / previous.nav - 1, 4)
          : 0;

    return {
      ...point,
      accumulatedNav: round(accumulatedNav, 4),
      dailyReturn
    };
  });
}

export function buildChartSeries(navSeries: NavPoint[]) {
  const cleaned = cleanNavSeries(navSeries[0]?.code ?? "", navSeries);
  const dates = cleaned.map((item) => item.date);
  const navs = cleaned.map((item) => item.nav);
  const accumulated = cleaned.map((item) => item.accumulatedNav ?? item.nav);
  const base = navs[0] ?? 1;
  const returns = navs.map((value, index) => (index === 0 ? 0 : round(value / base - 1, 4)));
  const drawdowns = calculateDrawdownSeries(navs);
  const ma5 = movingAverageSeries(navs, 5).map((value) => (value ? round(value, 4) : null));
  const ma20 = movingAverageSeries(navs, 20).map((value) => (value ? round(value, 4) : null));
  const ma60 = movingAverageSeries(navs, 60).map((value) => (value ? round(value, 4) : null));

  return {
    dates,
    navs,
    accumulated,
    returns,
    drawdowns,
    ma5,
    ma20,
    ma60,
    hasData: cleaned.length >= 2
  };
}

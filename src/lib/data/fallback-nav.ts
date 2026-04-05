import { subDays } from "date-fns";

import type { FundOverview, NavPoint } from "@/types/domain";

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function generateFallbackNavSeries(overview: FundOverview, points = 320): NavPoint[] {
  const series: NavPoint[] = [];
  const themeBiasMap: Record<string, number> = {
    宽基指数: 0.0002,
    红利低波: 0.00018,
    全球优质资产: 0.00025,
    海外科技: 0.0003,
    人工智能: 0.00032,
    医疗健康: 0.00024,
    创新药: 0.00022,
    高端制造: 0.00028,
    海外资产: 0.00023,
    消费: 0.00018
  };
  const volMap: Record<FundOverview["riskLevel"], number> = {
    低: 0.005,
    中低: 0.007,
    中: 0.009,
    中高: 0.011,
    高: 0.014
  };

  const drift = themeBiasMap[overview.theme] ?? 0.0002;
  const volatility = volMap[overview.riskLevel] ?? 0.009;
  let nav = 1;
  let date = subDays(new Date(), points * 1.5);
  let index = 0;

  while (series.length < points) {
    date = subDays(date, -1);
    if (!isBusinessDay(date)) {
      continue;
    }

    const seedBase = Number(overview.code) + series.length + index;
    const cyclical = Math.sin(series.length / 16) * 0.0025;
    const shock = (seededNoise(seedBase) - 0.5) * volatility;
    const dailyReturn = drift + cyclical + shock;
    nav *= 1 + dailyReturn;

    series.push({
      code: overview.code,
      date: date.toISOString().slice(0, 10),
      nav: Number(nav.toFixed(4)),
      accumulatedNav: Number((nav * 1.08).toFixed(4)),
      dailyReturn: Number(dailyReturn.toFixed(4))
    });
    index += 1;
  }

  return series;
}

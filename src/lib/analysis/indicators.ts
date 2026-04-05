import { env } from "@/lib/env";
import { average, clamp, round, std } from "@/lib/utils/math";
import type { FundMetrics, NavPoint, RiskAnalysis, TrendAnalysis } from "@/types/domain";

function closingPrices(navSeries: NavPoint[]) {
  return navSeries.map((point) => point.nav);
}

export function dailyReturns(navSeries: NavPoint[]) {
  if (navSeries.length < 2) {
    return [];
  }

  return navSeries.slice(1).map((point, index) => {
    const previous = navSeries[index]?.nav;
    if (!previous) {
      return 0;
    }

    return point.nav / previous - 1;
  });
}

export function movingAverage(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  return average(values.slice(-period));
}

export function movingAverageSeries(values: number[], period: number) {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    return average(values.slice(index + 1 - period, index + 1));
  });
}

function emaSeries(values: number[], period: number) {
  if (values.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let previous = values[0];
  result.push(previous);

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index] * multiplier + previous * (1 - multiplier);
    result.push(current);
    previous = current;
  }

  return result;
}

export function calculateMacd(values: number[]) {
  if (values.length === 0) {
    return { dif: null, dea: null, histogram: null };
  }

  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const difSeries = values.map((_, index) => ema12[index] - ema26[index]);
  const deaSeries = emaSeries(difSeries, 9);
  const lastIndex = difSeries.length - 1;

  return {
    dif: round(difSeries[lastIndex], 4),
    dea: round(deaSeries[lastIndex], 4),
    histogram: round((difSeries[lastIndex] - deaSeries[lastIndex]) * 2, 4)
  };
}

export function calculateRsi(values: number[], period = 14) {
  if (values.length <= period) {
    return null;
  }

  const changes = values.slice(1).map((value, index) => value - values[index]);
  const recent = changes.slice(-period);
  const gains = recent.filter((change) => change > 0).reduce((sum, change) => sum + change, 0);
  const losses = recent
    .filter((change) => change < 0)
    .reduce((sum, change) => sum + Math.abs(change), 0);

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;
  return round(100 - 100 / (1 + rs), 2);
}

export function calculateMaxDrawdown(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  let peak = values[0];
  let maxDrawdown = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    const drawdown = value / peak - 1;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return round(maxDrawdown, 4);
}

export function calculateDrawdownSeries(values: number[]) {
  if (values.length === 0) {
    return [];
  }

  let peak = values[0];
  return values.map((value) => {
    peak = Math.max(peak, value);
    return round(value / peak - 1, 4);
  });
}

export function calculateMetrics(navSeries: NavPoint[]): FundMetrics {
  const values = closingPrices(navSeries);
  const returns = dailyReturns(navSeries);
  const annualizedReturn = returns.length > 0 ? average(returns) * 252 : 0;
  const volatility = std(returns) * Math.sqrt(252);
  const sharpe =
    volatility === 0 ? 0 : (annualizedReturn - env.DEFAULT_RISK_FREE_RATE) / volatility;

  return {
    periodReturns: {
      month1: periodReturn(values, 21),
      month3: periodReturn(values, 63),
      month6: periodReturn(values, 126),
      year1: periodReturn(values, 252)
    },
    cagr1y: periodReturn(values, 252),
    maxDrawdown: calculateMaxDrawdown(values),
    volatility: round(volatility, 4),
    sharpe: round(sharpe, 4)
  };
}

export function analyzeTrend(navSeries: NavPoint[]): TrendAnalysis {
  const values = closingPrices(navSeries);
  const current = values.at(-1) ?? 0;
  const maxHigh = values.length > 0 ? Math.max(...values) : current;
  const ma5 = movingAverage(values, 5);
  const ma10 = movingAverage(values, 10);
  const ma20 = movingAverage(values, 20);
  const ma60 = movingAverage(values, 60);
  const macd = calculateMacd(values);
  const rsi14 = calculateRsi(values, 14);

  const shortTrend =
    ma5 && ma10 && current > ma5 && ma5 > ma10
      ? "走强"
      : ma5 && ma10 && current < ma5 && ma5 < ma10
        ? "走弱"
        : "震荡";

  const midTrend =
    ma20 && ma60 && current > ma20 && ma20 > ma60
      ? "走强"
      : ma20 && ma60 && current < ma20 && ma20 < ma60
        ? "走弱"
        : "震荡";

  let alignment: TrendAnalysis["alignment"] = "混合排列";
  if (ma5 && ma10 && ma20 && ma60 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
    alignment = "多头排列";
  } else if (ma5 && ma10 && ma20 && ma60 && ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
    alignment = "空头排列";
  }

  return {
    ma5: ma5 ? round(ma5) : null,
    ma10: ma10 ? round(ma10) : null,
    ma20: ma20 ? round(ma20) : null,
    ma60: ma60 ? round(ma60) : null,
    macd,
    rsi14,
    shortTrend,
    midTrend,
    alignment,
    drawdownFromHigh: maxHigh > 0 ? round(current / maxHigh - 1, 4) : 0
  };
}

export function analyzeRisk(navSeries: NavPoint[]): RiskAnalysis {
  const values = closingPrices(navSeries);
  const returns = dailyReturns(navSeries);
  const volatility = returns.length > 1 ? std(returns) * Math.sqrt(252) : 0;
  const annualizedReturn = returns.length > 0 ? average(returns) * 252 : 0;
  const sharpe =
    volatility === 0 ? 0 : (annualizedReturn - env.DEFAULT_RISK_FREE_RATE) / volatility;
  const maxDrawdown = calculateMaxDrawdown(values);
  const warnings: string[] = [];
  const latest = values.at(-1) ?? 0;
  const ma20 = movingAverage(values, 20);
  const ma60 = movingAverage(values, 60);
  const recent5d = periodReturn(values, 5) ?? 0;

  if (volatility > 0.28) {
    warnings.push("年化波动率偏高，短期净值波动可能明显放大。");
  }

  if (maxDrawdown <= -0.22) {
    warnings.push("历史最大回撤偏大，需控制单只基金仓位。");
  }

  if (ma20 && ma60 && latest < ma20 && ma20 < ma60) {
    warnings.push("价格运行在关键均线下方，趋势破位风险需重点观察。");
  }

  if (recent5d <= -0.08) {
    warnings.push("近期跌势较陡，若考虑加仓更应等待企稳信号。");
  }

  return {
    maxDrawdown,
    annualVolatility: round(volatility, 4),
    sharpeRatio: round(sharpe, 4),
    warnings
  };
}

export function periodReturn(values: number[], days: number) {
  if (values.length <= days) {
    return null;
  }

  const base = values[values.length - 1 - days];
  const latest = values.at(-1) ?? 0;
  if (!base) {
    return null;
  }

  return round(latest / base - 1, 4);
}

export function scoreToRange(value: number, min: number, max: number) {
  return clamp(value, min, max);
}

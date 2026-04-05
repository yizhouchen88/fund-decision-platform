import { subMonths } from "date-fns";

import { fetchText } from "@/lib/providers/http";
import type { MacroSnapshot } from "@/types/domain";

type FredPoint = {
  date: string;
  value: number;
};

function parseFredCsv(csv: string): FredPoint[] {
  const lines = csv.trim().split("\n").slice(1);
  return lines
    .map((line) => {
      const [date, value] = line.split(",");
      if (!date || !value || value === ".") {
        return null;
      }

      return {
        date,
        value: Number(value)
      };
    })
    .filter((item): item is FredPoint => Boolean(item));
}

async function fetchFredSeries(seriesId: string) {
  const csv = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
  return parseFredCsv(csv);
}

function findClosest(points: FredPoint[], targetDate: Date) {
  const target = targetDate.toISOString().slice(0, 10);
  const filtered = points.filter((item) => item.date <= target);
  return filtered.at(-1);
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const [vixSeries, spSeries, fedFunds, cpiSeries] = await Promise.all([
    fetchFredSeries("VIXCLS"),
    fetchFredSeries("SP500"),
    fetchFredSeries("FEDFUNDS"),
    fetchFredSeries("CPIAUCSL")
  ]);

  const latestVix = vixSeries.at(-1)?.value ?? 20;
  const latestSp = spSeries.at(-1)?.value ?? 0;
  const sp1mAgo = findClosest(spSeries, subMonths(new Date(), 1))?.value ?? latestSp;
  const latestFed = fedFunds.at(-1)?.value ?? 0;
  const fed6mAgo = findClosest(fedFunds, subMonths(new Date(), 6))?.value ?? latestFed;
  const latestCpi = cpiSeries.at(-1)?.value ?? 0;
  const cpi12mAgo = findClosest(cpiSeries, subMonths(new Date(), 12))?.value ?? latestCpi;
  const cpi15mAgo = findClosest(cpiSeries, subMonths(new Date(), 15))?.value ?? latestCpi;

  const sp1mReturn = sp1mAgo > 0 ? latestSp / sp1mAgo - 1 : 0;
  const inflationYoY = cpi12mAgo > 0 ? latestCpi / cpi12mAgo - 1 : 0;
  const inflationYoYPrev = cpi15mAgo > 0 ? latestCpi / cpi15mAgo - 1 : inflationYoY;

  let riskAppetite = "中性";
  if (latestVix >= 25 || sp1mReturn <= -0.05) {
    riskAppetite = "偏谨慎";
  } else if (latestVix <= 18 && sp1mReturn >= 0.03) {
    riskAppetite = "偏积极";
  }

  let policyBias = "利率高位观察";
  if (latestFed < fed6mAgo) {
    policyBias = "利率环境边际宽松";
  } else if (latestFed > fed6mAgo) {
    policyBias = "利率环境仍偏紧";
  }

  let inflationView = "通胀相对平稳";
  if (inflationYoY > inflationYoYPrev + 0.003) {
    inflationView = "通胀韧性偏强";
  } else if (inflationYoY < inflationYoYPrev - 0.003) {
    inflationView = "通胀压力边际回落";
  }

  return {
    snapshotDate: new Date().toISOString().slice(0, 10),
    riskAppetite,
    policyBias,
    inflationView: `${inflationView}，最新同比约 ${(inflationYoY * 100).toFixed(2)}%`,
    styleRotation:
      riskAppetite === "偏积极"
        ? "成长风格相对占优，但仍需避免在极端拥挤区间追高。"
        : "均衡与防守风格更稳，成长方向宜用分批和回撤观察方式参与。",
    importantEvents: [
      `VIX 最新约 ${latestVix.toFixed(2)}`,
      `标普500 近1月约 ${(sp1mReturn * 100).toFixed(2)}%`,
      `联邦基金利率最新约 ${latestFed.toFixed(2)}%`
    ],
    summary:
      "宏观模块用于辅助识别风险偏好和风格切换，不能替代基金本身的趋势、回撤和仓位分析。",
    updatedAt: new Date().toISOString()
  };
}

"use client";

import { useMemo, useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import { MetricGrid } from "@/components/ui/metric-grid";
import { analyzePortfolio } from "@/lib/analysis/portfolio";
import { formatPercent } from "@/lib/utils/format";

const initialState = {
  buyCost: 1.28,
  investedAmount: 10000,
  holdingShares: 7800,
  currentNav: 1.18,
  totalCapital: 50000,
  fundPositionRatio: 0.2,
  stopDrawdownThreshold: 0.08
};

export function PortfolioSimulator() {
  const [form, setForm] = useState(initialState);

  const result = useMemo(() => analyzePortfolio(form), [form]);

  return (
    <div className="grid">
      <SectionCard
        title="输入你的持仓参数"
        description="默认使用分批加仓、分批止盈和仓位风险控制逻辑。你可以直接修改数值，页面会实时重算。"
      >
        <div className="form-grid">
          {[
            ["buyCost", "买入成本"],
            ["investedAmount", "买入金额"],
            ["holdingShares", "持有份额"],
            ["currentNav", "当前净值"],
            ["totalCapital", "总资金"],
            ["fundPositionRatio", "当前该基金占总仓位比例"],
            ["stopDrawdownThreshold", "风险警戒线"]
          ].map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                inputMode="decimal"
                value={String(form[key as keyof typeof form])}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: Number(event.target.value)
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="分析结果"
        description="这里的提示强调纪律和节奏管理，不追求对短期涨跌做绝对判断。"
      >
        <MetricGrid
          items={[
            {
              label: "浮动盈亏",
              value: `${result.floatingPnL.toFixed(2)} 元`,
              hint: "以当前净值和持有份额估算"
            },
            {
              label: "收益率",
              value: formatPercent(result.returnRate),
              hint: "基于买入金额与当前市值"
            },
            {
              label: "回撤风险",
              value: result.estimatedDrawdownRisk,
              hint: "综合持仓浮亏与集中度"
            },
            {
              label: "仓位风险",
              value: result.positionRiskLevel,
              hint: "单只基金占组合比重"
            }
          ]}
        />
        <div style={{ height: 18 }} />
        <ul className="bullet-list">
          {result.suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

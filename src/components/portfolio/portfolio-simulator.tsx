"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { MetricGrid } from "@/components/ui/metric-grid";
import { SectionCard } from "@/components/ui/section-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils/format";
import type {
  FundSearchResult,
  PortfolioCollectionAnalysis,
  PortfolioHoldingInput
} from "@/types/domain";

const initialForm = {
  code: "",
  name: "",
  buyCost: 1,
  holdingShares: 1000,
  currentNav: 1,
  investedAmount: 1000,
  fundPositionRatio: 0.1
};

function parseNumber(value: string, fallback = 0) {
  const normalized = value.replace(/%$/, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function parseImportText(text: string): PortfolioHoldingInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const firstCells = lines[0].split(delimiter).map((cell) => cell.trim());
  const hasHeader = firstCells.some((cell) =>
    ["code", "基金代码", "name", "基金名称", "buycost", "买入成本"].includes(normalizeHeader(cell))
  );
  const header = hasHeader ? firstCells.map(normalizeHeader) : [];
  const dataRows = hasHeader ? lines.slice(1) : lines;

  return dataRows
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
    .map((cells) => {
      if (header.length > 0) {
        const row = Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]));
        return {
          code: row.code || row["基金代码"] || "",
          name: row.name || row["基金名称"] || "",
          buyCost: parseNumber(row.buycost || row["买入成本"] || "0"),
          holdingShares: parseNumber(row.holdingshares || row["持有份额"] || "0"),
          currentNav: parseNumber(row.currentnav || row["当前净值"] || "0"),
          investedAmount: parseNumber(row.investedamount || row["总投入金额"] || "0"),
          fundPositionRatio: parseNumber(row.fundpositionratio || row["仓位占比"] || "0")
        } satisfies PortfolioHoldingInput;
      }

      return {
        code: cells[0] ?? "",
        name: cells[1] ?? "",
        buyCost: parseNumber(cells[2] ?? "0"),
        holdingShares: parseNumber(cells[3] ?? "0"),
        currentNav: parseNumber(cells[4] ?? "0"),
        investedAmount: parseNumber(cells[5] ?? "0"),
        fundPositionRatio: parseNumber(cells[6] ?? "0")
      } satisfies PortfolioHoldingInput;
    })
    .filter((item) => item.code && item.buyCost > 0 && item.holdingShares > 0);
}

export function PortfolioSimulator() {
  const [form, setForm] = useState(initialForm);
  const [holdings, setHoldings] = useState<PortfolioHoldingInput[]>([]);
  const [totalCapital, setTotalCapital] = useState(50000);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importText, setImportText] = useState("");
  const [analysis, setAnalysis] = useState<PortfolioCollectionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const query = deferredQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        const payload = (await response.json()) as FundSearchResult[];
        startTransition(() => {
          setSearchResults(payload);
        });
      } catch {
        startTransition(() => {
          setSearchResults([]);
        });
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [deferredQuery]);

  useEffect(() => {
    if (holdings.length === 0) {
      setAnalysis(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsAnalyzing(true);

      try {
        const response = await fetch("/api/portfolio/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            holdings,
            totalCapital
          }),
          signal: controller.signal
        });
        const payload = (await response.json()) as PortfolioCollectionAnalysis;
        startTransition(() => {
          setAnalysis(payload);
        });
      } finally {
        setIsAnalyzing(false);
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [holdings, totalCapital]);

  const importPreview = useMemo(() => parseImportText(importText), [importText]);

  function selectFund(item: FundSearchResult) {
    setForm((current) => ({
      ...current,
      code: item.code,
      name: item.name,
      currentNav: item.latestNav ?? current.currentNav,
      investedAmount:
        current.buyCost > 0 && current.holdingShares > 0
          ? current.buyCost * current.holdingShares
          : current.investedAmount
    }));
    setSearchQuery(`${item.name} ${item.code}`);
    setSearchResults([]);
  }

  function addHolding() {
    if (!form.code || form.buyCost <= 0 || form.holdingShares <= 0) {
      return;
    }

    const nextHolding: PortfolioHoldingInput = {
      code: form.code,
      name: form.name,
      buyCost: form.buyCost,
      holdingShares: form.holdingShares,
      currentNav: form.currentNav,
      investedAmount: form.investedAmount || form.buyCost * form.holdingShares,
      fundPositionRatio: form.fundPositionRatio
    };

    setHoldings((current) => {
      const filtered = current.filter((item) => item.code !== nextHolding.code);
      return [...filtered, nextHolding];
    });
  }

  function importHoldings() {
    if (importPreview.length === 0) {
      return;
    }

    setHoldings((current) => {
      const merged = new Map(current.map((item) => [item.code, item]));
      for (const item of importPreview) {
        merged.set(item.code, item);
      }
      return Array.from(merged.values());
    });
    setImportText("");
  }

  async function handleFileImport(file: File) {
    const text = await file.text();
    setImportText(text);
  }

  return (
    <div className="grid">
      <SectionCard
        title="持仓录入"
        description="搜索基金后可手动添加，也支持粘贴 CSV / 制表符表格。搜索、详情和持仓分析共用同一套基金基础数据。"
      >
        <div className="empty-state" style={{ minHeight: "auto", placeItems: "start", textAlign: "left", padding: 18 }}>
          默认会带入基金最新单位净值。如果你导入的是场内 ETF 成交价格，请手动确认 `买入成本` 和 `当前净值/价格`，
          避免把场内成交价和场外基金净值混在一起导致盈亏失真。
        </div>
        <div className="grid cols-2">
          <div className="card card--soft portfolio-panel">
            <div className="field">
              <label htmlFor="portfolio-search">先搜索基金</label>
              <input
                id="portfolio-search"
                placeholder="输入基金代码、基金名称或中文关键词"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {deferredQuery.trim() ? (
              <div className="search-results">
                {isSearching ? (
                  <div className="search-result">正在搜索基金…</div>
                ) : searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map((item) => (
                    <button className="search-result" key={item.code} onClick={() => selectFund(item)} type="button">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="fund-card__meta">
                          {item.code} · {item.type} · {item.matchReason}
                        </div>
                      </div>
                      <span className="tag">{item.hasLocalData ? "完整数据" : "可同步详情"}</span>
                    </button>
                  ))
                ) : (
                  <div className="search-result">没有找到匹配基金，请尝试更完整的代码或名称。</div>
                )}
              </div>
            ) : null}

            <div className="form-grid">
              {[
                ["code", "基金代码"],
                ["name", "基金名称"],
                ["buyCost", "买入成本"],
                ["holdingShares", "持有份额"],
                ["currentNav", "当前净值"],
                ["investedAmount", "总投入金额"],
                ["fundPositionRatio", "仓位占比(0-1)"]
              ].map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    inputMode={key === "name" || key === "code" ? undefined : "decimal"}
                    value={String(form[key as keyof typeof form])}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]:
                          key === "name" || key === "code"
                            ? event.target.value
                            : Number(event.target.value)
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="badge-row" style={{ marginTop: 16 }}>
              <button className="button" onClick={addHolding} type="button">
                添加到持仓列表
              </button>
              <span className="tag">总资金</span>
              <input
                className="inline-input"
                inputMode="decimal"
                value={String(totalCapital)}
                onChange={(event) => setTotalCapital(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="card card--soft portfolio-panel">
            <div className="field">
              <label htmlFor="import-text">批量导入持仓</label>
              <textarea
                id="import-text"
                placeholder={`支持 CSV 或粘贴表格。\n示例：\ncode,name,buyCost,holdingShares,currentNav,investedAmount,fundPositionRatio\n510300,沪深300ETF,3.82,1000,3.68,3820,0.12`}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={10}
              />
            </div>
            <div className="badge-row" style={{ marginTop: 16 }}>
              <button className="button secondary" onClick={importHoldings} type="button">
                导入文本数据
              </button>
              <label className="button secondary" htmlFor="portfolio-file">
                导入 CSV 文件
              </label>
              <input
                hidden
                id="portfolio-file"
                accept=".csv,text/csv,.txt"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFileImport(file);
                  }
                }}
              />
            </div>
            <div className="fund-card__meta" style={{ marginTop: 16 }}>
              当前待导入 {importPreview.length} 条记录。支持列名：`code/name/buyCost/holdingShares/currentNav/investedAmount/fundPositionRatio`
              以及对应中文列名。
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="持仓列表"
        description="导入或手动添加后，系统会自动用同一套基金数据和策略逻辑分析每只持仓。"
      >
        {holdings.length > 0 ? (
          <div className="grid">
            {holdings.map((item) => (
              <div className="card card--soft" key={item.code}>
                <div className="fund-card__head">
                  <div>
                    <h3 className="fund-card__title">
                      {item.name || item.code}
                    </h3>
                    <div className="fund-card__meta">
                      {item.code} · 成本 {formatNumber(item.buyCost, 4)} · 份额 {formatNumber(item.holdingShares, 0)}
                    </div>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setHoldings((current) => current.filter((entry) => entry.code !== item.code))}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">还没有持仓记录。先搜索基金并添加，或直接导入 CSV / 粘贴表格。</div>
        )}
      </SectionCard>

      <SectionCard
        title="组合分析"
        description="系统会同时给出单只持仓建议和整个组合的集中度 / 风格 / 风险提示。"
      >
        {analysis ? (
          <div className="grid">
            <MetricGrid
              items={[
                {
                  label: "组合浮动盈亏",
                  value: `${formatNumber(analysis.summary.floatingPnL, 2)} 元`,
                  hint: "基于当前净值估算"
                },
                {
                  label: "组合收益率",
                  value: formatPercent(analysis.summary.returnRate),
                  hint: "以总投入金额为基准"
                },
                {
                  label: "组合风格",
                  value: analysis.summary.overallStyle
                },
                {
                  label: "集中度风险",
                  value: analysis.summary.concentrationRisk
                }
              ]}
            />

            <div className="grid cols-2">
              <div className="card card--soft">
                <h3 style={{ marginTop: 0 }}>组合建议</h3>
                <ul className="bullet-list">
                  {analysis.summary.suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {analysis.summary.warnings.length > 0 ? (
                  <>
                    <div style={{ height: 14 }} />
                    <h4 style={{ margin: 0 }}>需要警惕</h4>
                    <ul className="bullet-list" style={{ marginTop: 10 }}>
                      {analysis.summary.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              <div className="card card--soft">
                <h3 style={{ marginTop: 0 }}>组合结构</h3>
                <div className="badge-row">
                  <span className="tag">更适合长期拿住：{analysis.summary.coreHoldings.join("、") || "暂无"}</span>
                  <span className="tag">需要继续观察：{analysis.summary.watchlist.join("、") || "暂无"}</span>
                </div>
              </div>
            </div>

            <div className="grid">
              {analysis.holdings.map((item) => (
                <article className="card portfolio-result" key={item.code}>
                  <div className="fund-card__head">
                    <div>
                      <h3 className="fund-card__title">{item.name}</h3>
                      <div className="fund-card__meta">
                        {item.code} · {item.type} · {item.theme} · 更新于 {formatDate(item.lastUpdatedAt)}
                      </div>
                    </div>
                    <StatusChip value={item.status} />
                  </div>

                  <MetricGrid
                    items={[
                      {
                        label: "浮动盈亏",
                        value: `${formatNumber(item.floatingPnL, 2)} 元`
                      },
                      {
                        label: "收益率",
                        value: formatPercent(item.returnRate)
                      },
                      {
                        label: "仓位占比",
                        value: formatPercent(item.positionRatio)
                      },
                      {
                        label: "建议动作",
                        value: item.suggestedAction
                      }
                    ]}
                  />

                  <div className="grid cols-2" style={{ marginTop: 16 }}>
                    <div>
                      <h4 style={{ marginTop: 0 }}>判断依据</h4>
                      <ul className="bullet-list">
                        {item.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ marginTop: 0 }}>风险提示</h4>
                      <ul className="bullet-list">
                        {item.riskWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">{isAnalyzing ? "正在分析持仓…" : "添加持仓后，这里会自动显示组合建议。"}</div>
        )}
      </SectionCard>
    </div>
  );
}

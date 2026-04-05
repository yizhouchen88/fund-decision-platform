import Link from "next/link";

import { calculateMetrics } from "@/lib/analysis/indicators";
import { getNavSeries } from "@/lib/services/repository";
import { searchFunds } from "@/lib/services/fund-service";
import { formatDate, formatLargeNumber, formatPercent } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function FundsSearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const results = q ? await searchFunds(q) : [];

  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">基金搜索</span>
        <h1>按基金代码或名称检索，并直接查看关键指标。</h1>
        <p>搜索结果优先展示本地已同步的完整基金信息；若命中远程搜索索引，也会提供跳转入口到基金详情页。</p>
      </section>

      <section className="card">
        <form className="search-bar" method="get">
          <input
            aria-label="基金搜索"
            defaultValue={q}
            name="q"
            placeholder="输入基金代码、基金名称或主题，例如 513100 / 沪深300 / 人工智能"
          />
          <button className="button" type="submit">
            搜索
          </button>
        </form>
        <div style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>
          支持通过基金代码或基金名称搜索。若数据源临时不可用，系统会自动切换到本地缓存或种子数据兜底。
        </div>
      </section>

      {q ? (
        <section className="grid">
          {results.length > 0 ? (
            results.map((item) => {
              const navSeries = getNavSeries(item.code);
              const metrics = navSeries.length >= 60 ? calculateMetrics(navSeries) : null;
              return (
                <article className="card fund-card" key={item.code}>
                  <div className="fund-card__head">
                    <div>
                      <Link href={`/funds/${item.code}`}>
                        <h2 className="fund-card__title">{item.name}</h2>
                      </Link>
                      <div className="fund-card__meta">
                        {item.code} · {item.type} · {item.theme} · {item.matchReason} · 更新于 {formatDate(item.updatedAt)}
                      </div>
                    </div>
                    <Link className="button secondary" href={`/funds/${item.code}`}>
                      {item.canViewDetail ? "查看详情" : "仅查看基础信息"}
                    </Link>
                  </div>

                  <div className="badge-row">
                    <span className="tag">相关性 {item.relevanceScore}</span>
                    <span className="tag">{item.hasLocalData ? "本地已同步完整数据" : "可进入详情页补齐数据"}</span>
                  </div>

                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-item__label">基金经理</div>
                      <div className="info-item__value">{item.manager}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">基金公司</div>
                      <div className="info-item__value">{item.company}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">成立时间</div>
                      <div className="info-item__value">{formatDate(item.inceptionDate)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">资产规模</div>
                      <div className="info-item__value">{formatLargeNumber(item.scale)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">近1月</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.periodReturns.month1) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">近3月</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.periodReturns.month3) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">近6月</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.periodReturns.month6) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">近1年</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.periodReturns.year1) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">最大回撤</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.maxDrawdown) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">波动率</div>
                      <div className="info-item__value">
                        {metrics ? formatPercent(metrics.volatility) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">夏普比率</div>
                      <div className="info-item__value">
                        {metrics ? metrics.sharpe.toFixed(2) : "--"}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">风格暴露</div>
                      <div className="info-item__value">{item.styleExposure}</div>
                    </div>
                  </div>
                  {!metrics ? (
                    <div className="empty-state" style={{ minHeight: "auto", padding: 14 }}>
                      当前只有基础信息，点击详情页后会自动尝试同步更完整的净值与分析数据。
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <section className="card">
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                没有找到匹配结果。你可以尝试输入更完整的基金名称，或直接使用 6 位基金代码。
              </p>
            </section>
          )}
        </section>
      ) : null}
    </main>
  );
}

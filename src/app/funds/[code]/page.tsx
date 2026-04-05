import { notFound } from "next/navigation";
import type { EChartsOption } from "echarts";

import { EChartPanel } from "@/components/charts/echart-panel";
import { MetricGrid } from "@/components/ui/metric-grid";
import { SectionCard } from "@/components/ui/section-card";
import { StatusChip } from "@/components/ui/status-chip";
import { calculateDrawdownSeries, movingAverageSeries } from "@/lib/analysis/indicators";
import { getFundDetail } from "@/lib/services/fund-service";
import { formatDate, formatLargeNumber, formatNumber, formatPercent } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type FundDetailPageProps = {
  params: Promise<{
    code: string;
  }>;
};

function lineOption(
  title: string,
  dates: string[],
  series: Array<{ name: string; data: Array<number | null>; color: string }>
): EChartsOption {
  return {
    title: {
      text: title,
      left: 0,
      textStyle: {
        color: "#182127",
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: "axis"
    },
    legend: {
      top: 6,
      right: 0
    },
    grid: {
      left: 28,
      right: 18,
      top: 48,
      bottom: 28
    },
    xAxis: {
      type: "category" as const,
      data: dates,
      boundaryGap: false
    },
    yAxis: {
      type: "value",
      scale: true
    },
    series: series.map((item) => ({
      name: item.name,
      type: "line",
      smooth: true,
      showSymbol: false,
      data: item.data,
      lineStyle: {
        width: 2,
        color: item.color
      }
    }))
  };
}

export default async function FundDetailPage({ params }: FundDetailPageProps) {
  const { code } = await params;

  try {
    const detail = await getFundDetail(code);
    const dates = detail.navSeries.map((item) => item.date);
    const navs = detail.navSeries.map((item) => item.nav);
    const accumulated = detail.navSeries.map((item) => item.accumulatedNav ?? null);
    const drawdowns = calculateDrawdownSeries(navs);
    const returns = navs.map((value, index) =>
      index === 0 ? 0 : Number((value / navs[0] - 1).toFixed(4))
    );
    const ma5 = movingAverageSeries(navs, 5).map((value) => (value ? Number(value.toFixed(4)) : null));
    const ma20 = movingAverageSeries(navs, 20).map((value) => (value ? Number(value.toFixed(4)) : null));
    const ma60 = movingAverageSeries(navs, 60).map((value) => (value ? Number(value.toFixed(4)) : null));

    return (
      <main className="page-shell grid">
        <section className="page-title">
          <span className="eyebrow">{detail.overview.theme}</span>
          <h1>{detail.overview.name}</h1>
          <p>
            {detail.overview.code} · {detail.overview.type} · 最近更新时间 {formatDate(detail.lastUpdatedAt)}。
            系统会综合趋势、回撤、新闻辅助因子和长期逻辑，给出“买入 / 观察 / 持有 / 卖出”的辅助判断。
          </p>
        </section>

        <SectionCard
          title="基本信息"
          description="基础画像 + 风格暴露 + 最新净值，是策略分析的底层输入。"
          action={<StatusChip value={detail.decision.status} />}
        >
          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">基金经理</div>
              <div className="info-item__value">{detail.overview.manager}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">基金公司</div>
              <div className="info-item__value">{detail.overview.company}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">成立时间</div>
              <div className="info-item__value">{formatDate(detail.overview.inceptionDate)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">规模</div>
              <div className="info-item__value">{formatLargeNumber(detail.overview.scale)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">最新净值</div>
              <div className="info-item__value">{formatNumber(detail.overview.latestNav, 4)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">风格暴露</div>
              <div className="info-item__value">{detail.overview.styleExposure}</div>
            </div>
          </div>
          <div style={{ height: 18 }} />
          <div className="tag-row">
            {detail.overview.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="关键指标" description="收益、回撤、波动率和夏普比率共同决定风险收益结构。">
          <MetricGrid
            items={[
              {
                label: "近1月",
                value: formatPercent(detail.metrics.periodReturns.month1)
              },
              {
                label: "近3月",
                value: formatPercent(detail.metrics.periodReturns.month3)
              },
              {
                label: "近6月",
                value: formatPercent(detail.metrics.periodReturns.month6)
              },
              {
                label: "近1年",
                value: formatPercent(detail.metrics.periodReturns.year1)
              },
              {
                label: "最大回撤",
                value: formatPercent(detail.metrics.maxDrawdown)
              },
              {
                label: "年化波动率",
                value: formatPercent(detail.metrics.volatility)
              },
              {
                label: "夏普比率",
                value: detail.metrics.sharpe.toFixed(2),
                hint: "默认使用合理无风险利率估算"
              },
              {
                label: "阶段高点回撤",
                value: formatPercent(detail.trend.drawdownFromHigh)
              }
            ]}
          />
        </SectionCard>

        <div className="grid cols-2">
          <SectionCard title="净值走势图">
            <EChartPanel
              option={lineOption("单位净值 / 累计净值", dates, [
                { name: "单位净值", data: navs, color: "#1b625b" },
                { name: "累计净值", data: accumulated, color: "#a86d2d" }
              ])}
            />
          </SectionCard>
          <SectionCard title="收益率走势图">
            <EChartPanel
              option={lineOption("成立以来收益率", dates, [
                { name: "收益率", data: returns, color: "#2a6fe3" }
              ])}
            />
          </SectionCard>
          <SectionCard title="回撤图">
            <EChartPanel
              option={lineOption("回撤轨迹", dates, [
                { name: "回撤", data: drawdowns, color: "#a63f43" }
              ])}
            />
          </SectionCard>
          <SectionCard title="均线图">
            <EChartPanel
              option={lineOption("MA5 / MA20 / MA60", dates, [
                { name: "净值", data: navs, color: "#182127" },
                { name: "MA5", data: ma5, color: "#1b625b" },
                { name: "MA20", data: ma20, color: "#a86d2d" },
                { name: "MA60", data: ma60, color: "#2a6fe3" }
              ])}
            />
          </SectionCard>
        </div>

        <div className="grid cols-2">
          <SectionCard title="策略判断" description="结论必须有依据，且默认强调分批而不是一把梭哈。">
            <div className="badge-row">
              <StatusChip value={detail.decision.status} />
              <span className="tag">短期趋势：{detail.trend.shortTrend}</span>
              <span className="tag">中期趋势：{detail.trend.midTrend}</span>
              <span className="tag">{detail.trend.alignment}</span>
              <span className="tag">RSI14 {detail.trend.rsi14 ?? "--"}</span>
            </div>
            <div style={{ height: 18 }} />
            <ul className="bullet-list">
              {detail.decision.basis.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="评分构成" description="推荐与信号使用可解释评分模型，不把“最近涨得猛”直接等同于潜力。">
            <MetricGrid
              items={[
                { label: "趋势分", value: detail.score.trendScore.toFixed(1) },
                { label: "风险分", value: detail.score.riskScore.toFixed(1) },
                { label: "主题分", value: detail.score.themeScore.toFixed(1) },
                { label: "阶段表现分", value: detail.score.momentumScore.toFixed(1) },
                { label: "回撤控制分", value: detail.score.drawdownControlScore.toFixed(1) },
                { label: "新闻情绪辅助分", value: detail.score.newsSentimentScore.toFixed(1) },
                { label: "长期配置适配分", value: detail.score.allocationFitScore.toFixed(1) },
                { label: "总分", value: detail.score.totalScore.toFixed(1) }
              ]}
            />
          </SectionCard>
        </div>

        <div className="grid cols-2">
          <SectionCard title="风险提示" description="风险模块会优先提醒波动、回撤、趋势破位和短期跌势过陡。">
            <ul className="bullet-list">
              {detail.decision.riskWarnings.length > 0 ? (
                detail.decision.riskWarnings.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>当前未触发额外风险警告，但仍需遵守分散和分批原则。</li>
              )}
            </ul>
          </SectionCard>

          <SectionCard title="长期配置建议" description="辅助判断这只基金更适合核心仓、卫星仓还是观察仓。">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">适合定投</div>
                <div className="info-item__value">{detail.decision.suitableForSip ? "适合" : "不适合"}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">仓位角色</div>
                <div className="info-item__value">{detail.decision.allocationRole}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">建议持有周期</div>
                <div className="info-item__value">{detail.decision.holdPeriod}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">适合投资者</div>
                <div className="info-item__value">{detail.decision.investorFit}</div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid cols-2">
          <SectionCard title="近期新闻摘要" description="新闻只做辅助，不允许单条消息直接触发买卖。">
            <div className="insight-list">
              {detail.news.map((item) => (
                <a className="insight-item" href={item.url} key={item.id} rel="noreferrer" target="_blank">
                  <div className="badge-row">
                    <StatusChip value={item.sentiment} />
                    <span className="tag">{item.source}</span>
                    <span className="tag">{formatDate(item.publishedAt)}</span>
                  </div>
                  <h4 style={{ marginTop: 14 }}>{item.title}</h4>
                  <p>{item.summary}</p>
                </a>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="专家 / 机构观点摘要"
            description="观点模块会保留来源与日期，并明确标注“仅供辅助，不构成投资建议”。"
          >
            <div className="insight-list">
              {detail.opinions.map((item) => (
                <a className="insight-item" href={item.url} key={item.id} rel="noreferrer" target="_blank">
                  <div className="badge-row">
                    <StatusChip value={item.sentiment} />
                    <span className="tag">{item.source}</span>
                    <span className="tag">{formatDate(item.publishedAt)}</span>
                  </div>
                  <h4 style={{ marginTop: 14 }}>{item.title}</h4>
                  <p>{item.summary}</p>
                </a>
              ))}
            </div>
          </SectionCard>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}

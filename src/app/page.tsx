import Link from "next/link";

import { FundCard } from "@/components/ui/fund-card";
import { MetricGrid } from "@/components/ui/metric-grid";
import { SectionCard } from "@/components/ui/section-card";
import { StatusChip } from "@/components/ui/status-chip";
import { getDashboardData } from "@/lib/services/dashboard-service";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const dashboard = getDashboardData();

  return (
    <main className="page-shell grid">
      <section className="hero">
        <span className="eyebrow">长期投资辅助系统</span>
        <h1>把基金买卖时机从情绪判断，转成可解释的纪律判断。</h1>
        <p>
          这个平台不会承诺盈利，也不会给出拍脑袋式“神预测”。它会把趋势、回撤、风险指标、主题逻辑、新闻辅助因子和仓位管理放在同一套框架里，
          帮你判断更适合买入、观察、持有、减仓还是重新评估卖出。
        </p>
        <div className="risk-strip">
          <StatusChip value="继续观察" />
          <div>
            <strong>风险提示</strong>
            <div style={{ color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.6 }}>
              {dashboard.riskNotice} 最近刷新时间：{formatDate(dashboard.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="平台视角概览"
        description="先看宏观风险偏好和组合风格，再决定是偏成长、偏防守还是偏均衡。"
      >
        <MetricGrid
          items={[
            {
              label: "市场风险偏好",
              value: dashboard.macro.riskAppetite,
              hint: "宏观辅助因子，不替代基金本身分析"
            },
            {
              label: "利率环境",
              value: dashboard.macro.policyBias,
              hint: dashboard.macro.summary
            },
            {
              label: "通胀观察",
              value: dashboard.macro.inflationView,
              hint: "用于辅助判断估值压力"
            },
            {
              label: "风格切换",
              value: dashboard.macro.styleRotation,
              hint: "成长 / 防守 / 均衡"
            }
          ]}
        />
        <div style={{ height: 18 }} />
        <ul className="bullet-list">
          {dashboard.macro.importantEvents.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid cols-2">
        <SectionCard
          title="当前重点关注基金"
          description="优先展示更接近分批布局区间的基金，默认服务于长期投资者，不鼓励追高。"
          action={
            <Link className="button secondary" href="/recommendations">
              查看完整推荐
            </Link>
          }
        >
          <div className="grid">
            {dashboard.focusFunds.map((item) => (
              <FundCard item={item} key={`${item.bucket}-${item.code}`} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="最新信号"
          description="信号改为当前状态分区，消息面只做辅助，不会单独触发买卖。"
        >
          <div className="grid">
            {dashboard.latestSignals.map((item) => (
              <div className="card card--soft" key={`${item.bucket}-${item.code}`}>
                <div className="fund-card__head">
                  <div>
                    <Link href={`/funds/${item.code}`}>
                      <h3 className="fund-card__title">{item.name}</h3>
                    </Link>
                    <div className="fund-card__meta">{item.code} · {item.theme}</div>
                  </div>
                  <StatusChip value={item.decision} />
                </div>
                <div className="badge-row">
                  <span className="tag">{item.bucket}</span>
                  <span className="tag">{item.suggestedAction}</span>
                </div>
                <ul className="fund-card__list">
                  {item.reasons.slice(0, 2).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="热门基金主题"
        description="以下主题偏向符合中长期社会发展方向，但是否适合布局，仍要回到趋势、回撤和仓位。"
      >
        <div className="grid cols-3">
          {dashboard.hotThemes.map((theme) => (
            <div className="card card--soft" key={theme.theme}>
              <span className="eyebrow alt">{theme.theme}</span>
              <p className="fund-card__desc" style={{ marginTop: 14 }}>
                {theme.description}
              </p>
              <div className="tag-row" style={{ marginTop: 14 }}>
                {theme.representativeFunds.map((code) => (
                  <Link className="tag" href={`/funds/${code}`} key={code}>
                    {code}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}

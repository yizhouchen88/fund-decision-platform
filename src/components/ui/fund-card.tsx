import Link from "next/link";

import { StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { RecommendationItem } from "@/types/domain";

type FundCardProps = {
  item: RecommendationItem;
};

function bucketClass(bucket: RecommendationItem["bucket"]) {
  if (bucket === "红色区域：现在适合买") {
    return "fund-card--buy-zone";
  }

  if (bucket === "适合分批买入") {
    return "fund-card--batch-zone";
  }

  if (bucket === "继续观察") {
    return "fund-card--watch-zone";
  }

  return "fund-card--risk-zone";
}

export function FundCard({ item }: FundCardProps) {
  return (
    <article className={`card fund-card ${bucketClass(item.bucket)}`}>
      <div className="fund-card__head">
        <div>
          <Link href={`/funds/${item.code}`}>
            <h3 className="fund-card__title">{item.name}</h3>
          </Link>
          <div className="fund-card__meta">
            {item.code} · {item.type} · {item.theme} · 最新净值 {formatNumber(item.latestNav)} · 更新于{" "}
            {formatDate(item.latestNavDate)}
          </div>
        </div>
        <StatusChip value={item.decision} />
      </div>

      <div className="badge-row">
        <span className="tag">{item.bucket}</span>
        <span className="tag">建议动作：{item.suggestedAction}</span>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric__label">总分</div>
          <div className="metric__value">{formatNumber(item.score.totalScore, 1)}</div>
          <div className="metric__hint">趋势 {item.score.trendScore} / 风险 {item.score.riskScore}</div>
        </div>
        <div className="metric">
          <div className="metric__label">主题分</div>
          <div className="metric__value">{formatNumber(item.score.themeScore, 1)}</div>
          <div className="metric__hint">长期方向与配置适配度</div>
        </div>
        <div className="metric">
          <div className="metric__label">新闻辅助分</div>
          <div className="metric__value">{formatNumber(item.score.newsSentimentScore, 1)}</div>
          <div className="metric__hint">仅作辅助，不单独触发买卖</div>
        </div>
      </div>

      <ul className="fund-card__list">
        {item.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="card card--soft">
        <div className="info-item__label">消息面辅助判断</div>
        <div className="fund-card__desc" style={{ marginTop: 10 }}>
          {item.messageImpact}
        </div>
      </div>

      <div className="card card--soft">
        <div className="info-item__label">风险提示</div>
        <ul className="fund-card__list" style={{ marginTop: 10 }}>
          {item.riskWarnings.slice(0, 2).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

import Link from "next/link";

import { StatusChip } from "@/components/ui/status-chip";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { RecommendationItem } from "@/types/domain";

type FundCardProps = {
  item: RecommendationItem;
};

export function FundCard({ item }: FundCardProps) {
  return (
    <article className="card fund-card">
      <div className="fund-card__head">
        <div>
          <Link href={`/funds/${item.code}`}>
            <h3 className="fund-card__title">{item.name}</h3>
          </Link>
          <div className="fund-card__meta">
            {item.code} · {item.theme} · 最新净值 {formatNumber(item.latestNav)} · 更新于{" "}
            {formatDate(item.latestNavDate)}
          </div>
        </div>
        <StatusChip value={item.decision} />
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
    </article>
  );
}

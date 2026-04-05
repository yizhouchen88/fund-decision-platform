import { FundCard } from "@/components/ui/fund-card";
import { SectionCard } from "@/components/ui/section-card";
import { getRecommendationData } from "@/lib/services/dashboard-service";
import type { FundBucket } from "@/types/domain";

export const dynamic = "force-dynamic";

const bucketOrder: FundBucket[] = [
  "红色区域：现在适合买",
  "适合分批买入",
  "继续观察",
  "谨慎 / 风险偏高"
];

const bucketMeta: Record<FundBucket, { description: string; className: string }> = {
  "红色区域：现在适合买": {
    description:
      "条件最严格的区域。只有当回撤进入合理区间、趋势开始企稳、消息面未明显恶化且风险收益比改善时，才会进入这里。",
    className: "zone zone--buy"
  },
  "适合分批买入": {
    description:
      "已经具备开始布局的基础，但信号强度还不够激进。默认建议拆成多笔，严格控制单笔仓位。",
    className: "zone zone--batch"
  },
  "继续观察": {
    description:
      "当前还不到直接出手的时候，需要继续观察趋势、净值企稳、消息确认或风险缓解。",
    className: "zone zone--watch"
  },
  "谨慎 / 风险偏高": {
    description:
      "当前波动、趋势或消息面偏弱，不适合轻易买入。重点是识别风险来源，而不是逆势加码。",
    className: "zone zone--risk"
  }
};

export default function RecommendationsPage() {
  const items = getRecommendationData();

  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">基金推荐</span>
        <h1>推荐页改成“当前状态分区”，先看现在该做什么，再看为什么。</h1>
        <p>
          每只基金只会进入一个当前状态分区。系统会把净值位置、回撤水平、趋势企稳程度、波动率、消息面辅助因子和长期逻辑放到同一个规则框架里，
          结论默认服务于长期主义者，不鼓励追高，也不把单条新闻当作买卖按钮。
        </p>
      </section>

      {bucketOrder.map((bucket) => {
        const bucketItems = items.filter((item) => item.bucket === bucket);

        return (
          <SectionCard
            key={bucket}
            title={bucket}
            className={bucketMeta[bucket].className}
            description={bucketMeta[bucket].description}
          >
            {bucketItems.length > 0 ? (
              <div className="grid">
                {bucketItems.map((item) => (
                  <FundCard item={item} key={`${bucket}-${item.code}`} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                当前没有基金进入这个分区。系统宁可少给信号，也不会为了填满列表而放宽条件。
              </div>
            )}
          </SectionCard>
        );
      })}
    </main>
  );
}

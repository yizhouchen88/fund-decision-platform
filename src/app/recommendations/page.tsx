import { FundCard } from "@/components/ui/fund-card";
import { SectionCard } from "@/components/ui/section-card";
import { getRecommendationData } from "@/lib/services/dashboard-service";
import type { FundBucket } from "@/types/domain";

export const dynamic = "force-dynamic";

const bucketOrder: FundBucket[] = [
  "今日重点观察",
  "当前趋势较优",
  "中长期布局方向",
  "防守型基金",
  "进攻型基金",
  "海外配置型基金"
];

export default function RecommendationsPage() {
  const items = getRecommendationData();

  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">基金推荐</span>
        <h1>推荐不是“神基榜”，而是可解释的长期布局候选池。</h1>
        <p>
          评分模型会综合趋势分、风险分、主题分、阶段表现分、回撤控制分、新闻情绪辅助分和长期配置适配分。
          所有推荐默认强调分批、纪律和风险收益比，不以短线暴涨作为唯一标准。
        </p>
      </section>

      {bucketOrder.map((bucket) => {
        const bucketItems = items.filter((item) => item.bucket === bucket);
        if (bucketItems.length === 0) {
          return null;
        }

        return (
          <SectionCard
            key={bucket}
            title={bucket}
            description="每只基金都附带推荐理由，且理由会明确指出趋势、回撤和长期逻辑。"
          >
            <div className="grid">
              {bucketItems.map((item) => (
                <FundCard item={item} key={`${bucket}-${item.code}`} />
              ))}
            </div>
          </SectionCard>
        );
      })}
    </main>
  );
}

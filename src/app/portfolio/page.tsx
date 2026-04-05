import { PortfolioSimulator } from "@/components/portfolio/portfolio-simulator";

export default function PortfolioPage() {
  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">我的持仓模拟</span>
        <h1>把成本、仓位、收益和回撤风险放进同一个纪律框架。</h1>
        <p>
          页面会自动计算浮动盈亏、收益率、仓位是否过高、是否触发分批加仓和分批止盈，以及是否达到风险警戒线。
        </p>
      </section>
      <PortfolioSimulator />
    </main>
  );
}

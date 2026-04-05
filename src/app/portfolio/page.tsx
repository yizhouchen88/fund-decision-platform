import { PortfolioSimulator } from "@/components/portfolio/portfolio-simulator";

export default function PortfolioPage() {
  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">我的持仓模拟</span>
        <h1>把持仓导入、单只分析和组合建议放进同一个纪律框架。</h1>
        <p>
          你可以搜索基金、手动添加持仓，也可以导入 CSV 或粘贴表格。系统会自动分析每只基金当前是否适合继续持有、
          分批加仓、继续观察或暂不操作，并给出组合层面的集中度和风格建议。
        </p>
      </section>
      <PortfolioSimulator />
    </main>
  );
}

export default function AboutPage() {
  return (
    <main className="page-shell grid">
      <section className="page-title">
        <span className="eyebrow">关于平台</span>
        <h1>这是一个长期投资研究与决策辅助平台，不是稳赚不赔预测软件。</h1>
        <p>
          平台目标是帮助长期投资者减少情绪化交易，建立更可解释的基金研究和仓位管理框架。
        </p>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>风险声明</h2>
            <p>以下声明会在首页、详情页和推荐页中反复出现，不允许被隐藏或弱化。</p>
          </div>
        </div>
        <ul className="bullet-list">
          <li>本平台不承诺盈利，不提供“保证赚钱”“稳赢”“必涨”类表述。</li>
          <li>所有结论都基于公开数据、量化指标、主题逻辑和新闻辅助因子生成，只用于辅助判断。</li>
          <li>新闻与机构观点不会单独触发买卖信号，必须结合趋势、回撤和仓位管理。</li>
          <li>任何页面内容都不构成个性化投资建议，请结合你的风险承受能力和投资期限独立判断。</li>
        </ul>
      </section>

      <div className="grid cols-2">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>数据来源</h2>
              <p>系统优先用公开、稳定、可自动化获取的数据源，并保留兜底策略。</p>
            </div>
          </div>
          <ul className="bullet-list">
            <li>基金净值与基础资料：天天基金公开页面与净值脚本。</li>
            <li>新闻与观点：Google News RSS 检索结果，按主题或基金名称聚合并做时间衰减。</li>
            <li>宏观辅助数据：FRED 公开序列，用于风险偏好、利率与通胀观察。</li>
            <li>当远程源失败时，自动回退到本地缓存或种子数据，避免页面空白。</li>
          </ul>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <h2>策略框架</h2>
              <p>策略以长期主义和分批纪律为核心，而不是短线预测。</p>
            </div>
          </div>
          <ul className="bullet-list">
            <li>趋势分析：MA5 / MA10 / MA20 / MA60、MACD、RSI。</li>
            <li>风险分析：最大回撤、年化波动率、夏普比率、趋势破位提醒。</li>
            <li>买入逻辑：从阶段高点回撤达到 5% 进入首档分批买入观察区，之后每增加 5% 进入下一档。</li>
            <li>卖出逻辑：趋势明显转弱、关键均线失守、仓位过高或回撤超过阈值时触发风险提示。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

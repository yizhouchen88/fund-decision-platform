# 基金买卖时机辅助决策平台

长期投资者的基金研究与决策辅助平台。目标不是预测“稳赚不赔”，而是用可解释规则帮助你判断更适合买入、分批加仓、继续观察、持有还是谨慎卖出。

## 1. 核心功能

- 首页 / 仪表盘：展示重点关注基金、最新信号、宏观环境概览、热门主题方向。
- 基金搜索：支持按代码或名称搜索，并展示基金经理、基金公司、收益、回撤、波动率、夏普等指标。
- 基金详情页：展示净值、收益率、回撤、均线图，以及策略判断、风险提示、新闻摘要、观点摘要和长期配置建议。
- 基金推荐页：输出今日重点观察、趋势较优、中长期布局方向、防守型、进攻型、海外配置型基金。
- 我的持仓模拟页：按买入成本、仓位和当前净值计算盈亏、收益率、仓位风险、分批加仓与止盈提示。
- 自动更新：支持脚本触发和容器内置定时刷新。

## 2. 技术栈

- 前端 / 后端：Next.js 15 + TypeScript + App Router + API Routes
- 数据存储：SQLite（基于 Node 内建 `node:sqlite`）
- 图表：ECharts
- 测试：Vitest
- 调度：node-cron
- 部署：Docker / Render

## 3. 数据来源与降级策略

- 基金净值与基础资料：天天基金公开页面、`pingzhongdata` 脚本
- 新闻与观点：Google News RSS 检索结果
- 宏观辅助数据：FRED 公开序列
- 兜底方案：
  - 若基金数据拉取失败，自动回退到本地缓存或种子基金画像
  - 若净值历史不可用，自动生成可解释的离线示例净值序列，确保页面、策略引擎和测试可用
  - 若新闻或宏观失败，保留最近缓存快照和种子说明，不让页面空白

## 4. 策略与评分框架

- 趋势分析：MA5 / MA10 / MA20 / MA60、MACD、RSI
- 风险分析：最大回撤、年化波动率、夏普比率、趋势破位提醒、波动过高提醒
- 买入逻辑：
  - 从阶段高点回撤达到 5% 时进入首档分批买入观察区
  - 之后每增加 5% 回撤，进入下一档分批加仓观察区
  - 若短期跌势过陡，则提示等待企稳，不盲目抄底
- 卖出逻辑：
  - 持仓模拟页默认按 10% 收益触发分批止盈提醒
  - 趋势明显转弱且跌破关键均线时提示谨慎卖出
  - 单只基金仓位过高时提示再平衡
- 评分模型：
  - 趋势分
  - 风险分
  - 中长期主题分
  - 近阶段表现分
  - 回撤控制分
  - 新闻情绪辅助分
  - 长期配置适配分

## 5. 本地运行

### 5.1 安装依赖

```bash
npm install
```

### 5.2 配置环境变量

复制 `.env.example` 为 `.env.local`，至少确认以下变量：

```bash
APP_URL=http://localhost:3000
DATABASE_PATH=./data/fund-platform.db
ADMIN_REFRESH_SECRET=change-me
DEFAULT_RISK_FREE_RATE=0.02
ENABLE_INTERNAL_CRON=false
CRON_EXPRESSION=0 */6 * * *
```

### 5.3 初始化数据

```bash
npm run seed
```

### 5.4 启动开发环境

```bash
npm run dev
```

### 5.5 生产构建与启动

```bash
npm run build
npm start
```

## 6. 自动更新

### 6.1 手动刷新

```bash
npm run refresh
```

### 6.2 API 刷新入口

```bash
GET /api/admin/refresh?secret=你的密钥
POST /api/admin/refresh
Header: x-refresh-secret: 你的密钥
```

### 6.3 内置定时任务

当 `ENABLE_INTERNAL_CRON=true` 时，服务进程会按 `CRON_EXPRESSION` 定时刷新基金、新闻、宏观和推荐结果。

## 7. 测试与检查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 8. Docker 部署

```bash
docker compose up --build
```

默认会把数据库挂载到容器卷 `fund-data`，避免 SQLite 数据丢失。

## 9. Render 免费部署

仓库中的 [render.yaml](/Users/chenyizhou/Desktop/myproject/render.yaml) 已切换为 Render `free` web service 配置：

- `plan: free`
- 不使用 persistent disk
- `DATABASE_PATH=/app/data/fund-platform.db`
- `ENABLE_INTERNAL_CRON=false`

这意味着：

- 服务可以按 Render 免费 Web Service 方式部署
- SQLite 数据会跟随镜像一起构建，并在构建阶段执行 `npm run seed`
- 免费实例的文件系统是临时的，重新部署或休眠后，本地写入的数据不会长期保留
- 如果需要手动刷新数据，可调用 `/api/admin/refresh`

健康检查接口：

```bash
/api/health
```

重新部署免费版时，建议：

1. 在 Render 中重新同步 Blueprint
2. 确认实例计划显示为 `Free`
3. 确认没有 attached disk
4. 部署完成后访问首页与 `/api/health`

## 10. 风险声明

- 本平台仅提供研究与辅助决策，不承诺收益。
- 新闻和观点只作为辅助因子，不能作为唯一买卖依据。
- 所有建议默认强调分批、仓位控制与长期纪律。
- 平台输出不构成任何个性化投资建议。

## 11. 后续扩展建议

- 接入更完整的基金持仓、行业暴露和基金经理历史数据
- 引入用户账户体系与自定义自选基金池
- 将新闻摘要与观点摘要升级为 LLM 辅助总结
- 用 PostgreSQL 替换单机 SQLite，支持多人或更高并发
- 为推荐与信号增加回测看板

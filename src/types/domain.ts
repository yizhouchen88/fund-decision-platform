export type SentimentLabel = "利好" | "利空" | "中性";
export type DecisionLabel =
  | "适合买入"
  | "分批买入"
  | "继续观察"
  | "持有"
  | "分批止盈"
  | "谨慎卖出";

export type FundBucket =
  | "今日重点观察"
  | "当前趋势较优"
  | "中长期布局方向"
  | "防守型基金"
  | "进攻型基金"
  | "海外配置型基金";

export interface FundSeed {
  code: string;
  name: string;
  type: string;
  company: string;
  manager: string;
  inceptionDate: string;
  scale?: number;
  theme: string;
  tags: string[];
  styleExposure: string;
  riskLevel: "低" | "中低" | "中" | "中高" | "高";
  summary: string;
}

export interface FundOverview extends FundSeed {
  latestNav?: number;
  latestNavDate?: string;
  updatedAt: string;
  source: string;
}

export interface NavPoint {
  code: string;
  date: string;
  nav: number;
  accumulatedNav?: number;
  dailyReturn?: number;
}

export interface NewsItem {
  id: string;
  relatedCode?: string;
  relatedTheme?: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: SentimentLabel;
  sentimentScore: number;
  weight: number;
  contentType: "news" | "opinion";
}

export interface MacroSnapshot {
  snapshotDate: string;
  riskAppetite: string;
  policyBias: string;
  inflationView: string;
  styleRotation: string;
  importantEvents: string[];
  summary: string;
  updatedAt: string;
}

export interface TrendAnalysis {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  macd: {
    dif: number | null;
    dea: number | null;
    histogram: number | null;
  };
  rsi14: number | null;
  shortTrend: "走强" | "震荡" | "走弱";
  midTrend: "走强" | "震荡" | "走弱";
  alignment: "多头排列" | "空头排列" | "混合排列";
  drawdownFromHigh: number;
}

export interface RiskAnalysis {
  maxDrawdown: number;
  annualVolatility: number;
  sharpeRatio: number;
  warnings: string[];
}

export interface StrategyDecision {
  status: DecisionLabel;
  basis: string[];
  riskWarnings: string[];
  suitableForSip: boolean;
  allocationRole: "核心仓" | "卫星仓" | "观察仓";
  holdPeriod: "短中期" | "中长期" | "长期";
  investorFit: string;
}

export interface ScoreBreakdown {
  trendScore: number;
  riskScore: number;
  themeScore: number;
  momentumScore: number;
  drawdownControlScore: number;
  newsSentimentScore: number;
  allocationFitScore: number;
  totalScore: number;
}

export interface FundMetrics {
  periodReturns: {
    month1: number | null;
    month3: number | null;
    month6: number | null;
    year1: number | null;
  };
  cagr1y: number | null;
  maxDrawdown: number;
  volatility: number;
  sharpe: number;
}

export interface FundDetail {
  overview: FundOverview;
  navSeries: NavPoint[];
  metrics: FundMetrics;
  trend: TrendAnalysis;
  risk: RiskAnalysis;
  decision: StrategyDecision;
  score: ScoreBreakdown;
  news: NewsItem[];
  opinions: NewsItem[];
  recommendationReasons: string[];
  lastUpdatedAt: string;
}

export interface RecommendationItem {
  bucket: FundBucket;
  code: string;
  name: string;
  theme: string;
  score: ScoreBreakdown;
  latestNav?: number;
  latestNavDate?: string;
  reasons: string[];
  decision: DecisionLabel;
}

export interface DashboardData {
  lastUpdatedAt: string;
  riskNotice: string;
  focusFunds: RecommendationItem[];
  latestSignals: RecommendationItem[];
  macro: MacroSnapshot;
  hotThemes: Array<{
    theme: string;
    description: string;
    representativeFunds: string[];
  }>;
}

export interface PortfolioInput {
  buyCost: number;
  investedAmount: number;
  holdingShares: number;
  currentNav: number;
  totalCapital: number;
  fundPositionRatio: number;
  stopDrawdownThreshold?: number;
}

export interface PortfolioAnalysis {
  floatingPnL: number;
  returnRate: number;
  estimatedDrawdownRisk: string;
  positionRiskLevel: "低" | "中" | "高";
  addPositionTriggered: boolean;
  takeProfitTriggered: boolean;
  riskAlertTriggered: boolean;
  suggestions: string[];
}

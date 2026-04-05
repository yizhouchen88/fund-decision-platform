import type { FundSeed, MacroSnapshot, NewsItem } from "@/types/domain";

export const trackedFundSeeds: FundSeed[] = [
  {
    code: "510300",
    name: "沪深300ETF",
    type: "宽基指数",
    company: "华泰柏瑞基金",
    manager: "指数团队",
    inceptionDate: "2012-05-04",
    scale: 35000000000,
    theme: "宽基指数",
    tags: ["核心配置", "A股宽基", "长期定投"],
    styleExposure: "大盘蓝筹、金融消费与制造均衡",
    riskLevel: "中",
    summary: "适合作为长期核心仓位的宽基底仓，风格较均衡。"
  },
  {
    code: "510500",
    name: "中证500ETF",
    type: "宽基指数",
    company: "南方基金",
    manager: "指数团队",
    inceptionDate: "2013-02-06",
    scale: 15000000000,
    theme: "宽基指数",
    tags: ["中盘成长", "景气轮动", "长期配置"],
    styleExposure: "中盘成长与制造业占比较高",
    riskLevel: "中高",
    summary: "适合作为成长风格配置的中盘宽基，波动高于沪深300。"
  },
  {
    code: "159915",
    name: "创业板ETF",
    type: "指数ETF",
    company: "易方达基金",
    manager: "指数团队",
    inceptionDate: "2011-09-20",
    scale: 12000000000,
    theme: "人工智能",
    tags: ["成长", "科技创新", "高波动"],
    styleExposure: "成长股、科技与先进制造",
    riskLevel: "高",
    summary: "受成长风格切换影响较大，更适合卫星仓和分批布局。"
  },
  {
    code: "512480",
    name: "半导体ETF",
    type: "行业ETF",
    company: "国联安基金",
    manager: "指数团队",
    inceptionDate: "2019-05-08",
    scale: 9000000000,
    theme: "人工智能",
    tags: ["半导体", "AI算力", "高景气"],
    styleExposure: "半导体设计、制造与设备链",
    riskLevel: "高",
    summary: "与AI算力和国产替代逻辑高度相关，但波动显著。"
  },
  {
    code: "159995",
    name: "芯片ETF",
    type: "行业ETF",
    company: "华夏基金",
    manager: "指数团队",
    inceptionDate: "2020-01-20",
    scale: 6000000000,
    theme: "人工智能",
    tags: ["芯片", "科技", "高弹性"],
    styleExposure: "芯片设计、封测与设备链",
    riskLevel: "高",
    summary: "适合在成长风格改善阶段分批关注，不宜重仓追高。"
  },
  {
    code: "159938",
    name: "医药ETF",
    type: "行业ETF",
    company: "广发基金",
    manager: "指数团队",
    inceptionDate: "2013-08-29",
    scale: 7000000000,
    theme: "医疗健康",
    tags: ["医疗健康", "创新药", "长期需求"],
    styleExposure: "创新药、医疗器械与医疗服务",
    riskLevel: "中高",
    summary: "医疗长期需求确定性较高，但政策扰动和情绪波动较明显。"
  },
  {
    code: "512010",
    name: "医药ETF",
    type: "行业ETF",
    company: "易方达基金",
    manager: "指数团队",
    inceptionDate: "2013-09-23",
    scale: 5000000000,
    theme: "创新药",
    tags: ["医药", "创新药", "防守成长"],
    styleExposure: "CXO、创新药、医疗器械",
    riskLevel: "中高",
    summary: "适合对创新药方向进行中长期观察与分批配置。"
  },
  {
    code: "516160",
    name: "新能源车ETF",
    type: "行业ETF",
    company: "华夏基金",
    manager: "指数团队",
    inceptionDate: "2021-08-03",
    scale: 4500000000,
    theme: "高端制造",
    tags: ["新能源车", "先进制造", "高波动"],
    styleExposure: "锂电、整车、智能驾驶",
    riskLevel: "高",
    summary: "景气度和产业链波动共存，更适合卫星仓位。"
  },
  {
    code: "159870",
    name: "化工ETF",
    type: "行业ETF",
    company: "华宝基金",
    manager: "指数团队",
    inceptionDate: "2021-02-08",
    scale: 2500000000,
    theme: "高端制造",
    tags: ["制造升级", "周期成长", "景气波动"],
    styleExposure: "材料、化工与制造升级链",
    riskLevel: "中高",
    summary: "受景气周期影响较大，宜配合趋势与估值区间观察。"
  },
  {
    code: "515180",
    name: "红利ETF",
    type: "策略ETF",
    company: "华泰柏瑞基金",
    manager: "指数团队",
    inceptionDate: "2018-11-09",
    scale: 18000000000,
    theme: "红利低波",
    tags: ["红利", "低波", "防守配置"],
    styleExposure: "高股息央国企、金融能源与公用事业",
    riskLevel: "中低",
    summary: "适合作为防守型仓位和组合稳态底仓。"
  },
  {
    code: "512890",
    name: "红利低波ETF",
    type: "策略ETF",
    company: "华安基金",
    manager: "指数团队",
    inceptionDate: "2018-12-19",
    scale: 9000000000,
    theme: "红利低波",
    tags: ["低波", "高股息", "防守"],
    styleExposure: "高分红与低波动因子组合",
    riskLevel: "低",
    summary: "适合风险承受较低的长期投资者做稳定配置。"
  },
  {
    code: "513100",
    name: "纳指ETF",
    type: "QDII-ETF",
    company: "国泰基金",
    manager: "指数团队",
    inceptionDate: "2013-04-25",
    scale: 22000000000,
    theme: "海外科技",
    tags: ["纳斯达克", "全球优质资产", "美元资产"],
    styleExposure: "美股科技龙头与平台型公司",
    riskLevel: "中高",
    summary: "适合做海外科技配置，但需关注估值与汇率波动。"
  },
  {
    code: "513500",
    name: "标普500ETF",
    type: "QDII-ETF",
    company: "博时基金",
    manager: "指数团队",
    inceptionDate: "2013-12-05",
    scale: 8000000000,
    theme: "全球优质资产",
    tags: ["美股宽基", "全球配置", "核心仓"],
    styleExposure: "美股大盘龙头与多行业均衡配置",
    riskLevel: "中",
    summary: "适合作为海外核心配置底仓，风格更均衡。"
  },
  {
    code: "159920",
    name: "恒生ETF",
    type: "QDII-ETF",
    company: "华夏基金",
    manager: "指数团队",
    inceptionDate: "2012-08-09",
    scale: 3000000000,
    theme: "海外资产",
    tags: ["港股", "中国资产", "估值修复"],
    styleExposure: "互联网、金融、消费和平台经济",
    riskLevel: "高",
    summary: "适合做估值修复型配置，但短期波动和事件风险偏高。"
  },
  {
    code: "161725",
    name: "白酒指数LOF",
    type: "行业指数",
    company: "招商基金",
    manager: "指数团队",
    inceptionDate: "2015-05-27",
    scale: 9000000000,
    theme: "消费",
    tags: ["消费", "高波动", "情绪敏感"],
    styleExposure: "白酒龙头与消费升级",
    riskLevel: "高",
    summary: "长期逻辑取决于消费复苏与估值修复，不适合情绪化追涨。"
  }
];

export const hotThemeMeta = [
  {
    theme: "人工智能",
    description: "关注算力、芯片、云与应用落地链条，适合高波动承受能力较强的长期投资者。",
    representativeFunds: ["512480", "159995", "159915"]
  },
  {
    theme: "医疗健康",
    description: "老龄化与创新药驱动长期需求，但政策和估值波动不可忽视。",
    representativeFunds: ["159938", "512010"]
  },
  {
    theme: "高端制造",
    description: "制造升级与自主可控具备长期空间，适合分批布局。",
    representativeFunds: ["516160", "159870", "510500"]
  },
  {
    theme: "能源",
    description: "传统能源偏红利防守，新能源偏高景气高波动，需区别对待。",
    representativeFunds: ["515180", "516160"]
  },
  {
    theme: "红利低波",
    description: "在利率下行与风险偏好偏弱阶段更容易体现防守价值。",
    representativeFunds: ["512890", "515180"]
  },
  {
    theme: "海外资产",
    description: "用于分散单一市场风险，重点关注美股科技与全球龙头资产。",
    representativeFunds: ["513100", "513500", "159920"]
  },
  {
    theme: "宽基指数",
    description: "适合长期主义者做底仓配置，强调耐心与纪律。",
    representativeFunds: ["510300", "510500"]
  }
];

export const seedMacroSnapshot: MacroSnapshot = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  riskAppetite: "中性偏谨慎",
  policyBias: "利率预期仍是全球资产定价核心变量，需关注美联储措辞与流动性环境。",
  inflationView: "通胀韧性仍可能压制风险资产估值弹性，等待数据进一步确认。",
  styleRotation: "若海外科技强于红利低波，组合可适度偏成长；反之以均衡和防守为主。",
  importantEvents: [
    "关注美联储议息与通胀数据更新",
    "关注国内稳增长与产业支持政策",
    "关注全球地缘事件对风险偏好的冲击"
  ],
  summary: "当前宏观更适合以中长期视角分批布局，不宜因单日波动做情绪化决策。",
  updatedAt: new Date().toISOString()
};

export const seedInsights: NewsItem[] = [
  {
    id: "seed-opinion-ai-1",
    relatedTheme: "人工智能",
    title: "机构普遍认为算力与高端芯片仍是人工智能产业链的核心抓手",
    summary: "观点侧重长期产业趋势，强调业绩兑现与估值纪律需同步观察。",
    source: "平台种子观点",
    url: "https://example.com/opinion-ai",
    publishedAt: new Date().toISOString(),
    sentiment: "中性",
    sentimentScore: 0.12,
    weight: 0.6,
    contentType: "opinion"
  },
  {
    id: "seed-opinion-dividend-1",
    relatedTheme: "红利低波",
    title: "高股息与低波资产在风险偏好回落阶段更具组合稳定器属性",
    summary: "观点强调红利策略适合作为防守仓，但不意味着任何时点都应满仓切换。",
    source: "平台种子观点",
    url: "https://example.com/opinion-dividend",
    publishedAt: new Date().toISOString(),
    sentiment: "中性",
    sentimentScore: 0.08,
    weight: 0.55,
    contentType: "opinion"
  }
];

export interface LabelDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  scoreRange: [number, number]; // [min, max] score range
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  labels: LabelDefinition[];
}

export const LABEL_CATEGORIES: CategoryDefinition[] = [
  {
    id: "politics",
    name: "政治倾向 (Political Orientation)",
    description: "意识形态与政治立场",
    labels: [
      { id: "ideology", name: "左派 vs 右派", description: "平等/福利优先 vs 效率/增长优先", category: "politics", scoreRange: [-1, 1] },
      { id: "authority", name: "自由意志 vs 威权主义", description: "小政府/自由/去监管 vs 大政府/秩序/监管", category: "politics", scoreRange: [-1, 1] },
      { id: "change", name: "进步派 vs 传统派", description: "激进改革/Woke文化 vs 维护传统/保守价值观", category: "politics", scoreRange: [-1, 1] },
      { id: "geopolitics", name: "全球主义 vs 民族主义", description: "全球一体化/多元包容 vs 本国优先/排外", category: "politics", scoreRange: [-1, 1] },
      { id: "radicalism", name: "激进派 vs 温和派", description: "革命/极端手段 vs 改良/中庸之道", category: "politics", scoreRange: [-1, 1] },
      { id: "establishment", name: "建制派 vs 民粹派", description: "相信专家/精英治国 vs 相信平民/反精英/阴谋论", category: "politics", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "economy",
    name: "经济观点 (Economic View)",
    description: "财富观与经济体制倾向",
    labels: [
      { id: "market_vs_gov", name: "市场主导 vs 政府干预", description: "相信“看不见的手” vs 相信宏观调控", category: "economy", scoreRange: [-1, 1] },
      { id: "competition_vs_equality", name: "自由竞争 vs 平等分配", description: "优胜劣汰/社达 vs 共同富裕/UBI", category: "economy", scoreRange: [-1, 1] },
      { id: "speculation_vs_value", name: "投机 vs 价值", description: "币圈/炒作/暴富心理 vs 基本面/长期主义", category: "economy", scoreRange: [-1, 1] },
      { id: "micro_vs_macro", name: "微观实操 vs 宏观叙事", description: "搞钱/副业/生计 vs 国运/大棋局/汇率", category: "economy", scoreRange: [-1, 1] },
      { id: "real_vs_virtual", name: "实体经济 vs 虚拟经济", description: "制造业/实业救国 vs 互联网/金融/SaaS", category: "economy", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "society",
    name: "社会观点 (Social View)",
    description: "群体矛盾与社会结构",
    labels: [
      { id: "individualism_vs_collectivism", name: "个人主义 vs 集体主义", description: "自身权益优先 vs 大局/集体利益优先", category: "society", scoreRange: [-1, 1] },
      { id: "elite_vs_grassroots", name: "精英/奋斗 vs 草根/躺平", description: "狼性文化/慕强 vs 反内卷/摆烂", category: "society", scoreRange: [-1, 1] },
      { id: "feminism_vs_patriarchy", name: "女权 vs 父权", description: "性别平权/激进女权 vs 传统家庭观/红药丸(RedPill)", category: "society", scoreRange: [-1, 1] },
      { id: "urban_vs_rural", name: "城市 vs 乡土", description: "一线城市/中心化视角 vs 小镇青年/下沉市场视角", category: "society", scoreRange: [-1, 1] },
      { id: "generational_conflict", name: "代际冲突", description: "后浪/Z世代/整顿职场 vs 前浪/老一辈/吃苦耐劳", category: "society", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "technology",
    name: "科技观点 (Technology View)",
    description: "工具理性与技术态度",
    labels: [
      { id: "open_vs_closed", name: "开放 vs 封闭", description: "开源/Linux vs 闭源/苹果/专利", category: "technology", scoreRange: [-1, 1] },
      { id: "innovation_vs_security", name: "创新导向 vs 安全导向", description: "激进迭代 vs 稳健/隐私优先", category: "technology", scoreRange: [-1, 1] },
      { id: "optimism_vs_conservatism", name: "技术乐观 vs 技术保守", description: "AI乌托邦/加速主义 vs AI末日论/卢德主义", category: "technology", scoreRange: [-1, 1] },
      { id: "decentralization_vs_centralization", name: "去中心化 vs 中心化", description: "Web3/区块链/DAO vs Web2/平台垄断", category: "technology", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "culture",
    name: "文化观点 (Cultural View)",
    description: "审美与信仰",
    labels: [
      { id: "local_vs_global", name: "本土化 vs 全球化/西化", description: "文化自信/国潮 vs 普世价值/崇洋", category: "culture", scoreRange: [-1, 1] },
      { id: "spiritual_vs_material", name: "精神 vs 物质", description: "理想主义/哲学 vs 现实主义/消费", category: "culture", scoreRange: [-1, 1] },
      { id: "serious_vs_popular", name: "严肃 vs 通俗", description: "深度/艺术/小众 vs 娱乐/流行/大众", category: "culture", scoreRange: [-1, 1] },
      { id: "secular_vs_religious", name: "世俗 vs 宗教/神秘学", description: "唯物/科学/无神论 vs 宗教/玄学/星座/命理", category: "culture", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "environment",
    name: "环境观点 (Environment View)",
    description: "人与自然的关系",
    labels: [
      { id: "protection_vs_development", name: "环境保护 vs 经济发展", description: "绿水青山优先 vs 工业产值优先", category: "environment", scoreRange: [-1, 1] },
      { id: "climate_believer_vs_skeptic", name: "气候确信 vs 气候怀疑", description: "认为气候变暖是紧急危机 vs 认为是骗局/自然周期", category: "environment", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "entertainment",
    name: "娱乐偏好 (Entertainment)",
    description: "多巴胺来源",
    labels: [
      { id: "2d_vs_3d", name: "二次元 vs 三次元", description: "动漫/虚拟 vs 现实/明星", category: "entertainment", scoreRange: [-1, 1] },
      { id: "hardcore_vs_casual", name: "硬核 vs 休闲", description: "钻研/婆罗门/创造者 vs 吃瓜/路人/消费者", category: "entertainment", scoreRange: [-1, 1] },
      { id: "niche_vs_mainstream", name: "亚文化 vs 主流", description: "独立/地下/邪典(Cult) vs 爆款/跟风/排行榜", category: "entertainment", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "lifestyle_career",
    name: "生活与职场 (Lifestyle & Career)",
    description: "生存状态与发展路径",
    labels: [
      { id: "frugal_vs_luxury", name: "节俭 vs 奢华", description: "极简/挂逼/FIRE vs 消费主义/精致生活", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "stable_vs_risk", name: "稳定 vs 风险", description: "体制内/考公 vs 创业/自由职业", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "cat_vs_dog", name: "猫派 vs 狗派", description: "独立/宅 vs 热情/户外", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "family_vs_single", name: "婚育 vs 单身", description: "亲子/鸡娃/家庭琐事 vs 丁克/不婚/单身贵族", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "discipline_vs_hedonism", name: "养生/自律 vs 享乐", description: "健身/早起/成分党 vs 熬夜/美食/YOLO", category: "lifestyle_career", scoreRange: [-1, 1] }
    ]
  }
];

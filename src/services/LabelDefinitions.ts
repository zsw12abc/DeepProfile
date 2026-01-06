import { I18nService } from "./I18nService";

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

export const getLabelCategories = (): CategoryDefinition[] => {
  const isEn = I18nService.getLanguage() === 'en-US';

  return [
  {
    id: "politics",
    name: isEn ? "Political Orientation" : "政治倾向 (Political Orientation)",
    description: isEn ? "Ideology and Political Stance" : "意识形态与政治立场",
    labels: [
      { id: "ideology", name: isEn ? "Left vs Right" : "左派 vs 右派", description: isEn ? "Equality/Welfare vs Efficiency/Growth" : "平等/福利优先 vs 效率/增长优先", category: "politics", scoreRange: [-1, 1] },
      { id: "authority", name: isEn ? "Libertarian vs Authoritarian" : "自由意志 vs 威权主义", description: isEn ? "Small Gov/Liberty vs Big Gov/Order" : "小政府/自由/去监管 vs 大政府/秩序/监管", category: "politics", scoreRange: [-1, 1] },
      { id: "change", name: isEn ? "Progressive vs Traditional" : "进步派 vs 传统派", description: isEn ? "Radical Reform/Woke vs Tradition/Conservative" : "激进改革/Woke文化 vs 维护传统/保守价值观", category: "politics", scoreRange: [-1, 1] },
      { id: "geopolitics", name: isEn ? "Globalism vs Nationalism" : "全球主义 vs 民族主义", description: isEn ? "Global Integration/Diversity vs America First/Xenophobia" : "全球一体化/多元包容 vs 本国优先/排外", category: "politics", scoreRange: [-1, 1] },
      { id: "radicalism", name: isEn ? "Radical vs Moderate" : "激进派 vs 温和派", description: isEn ? "Revolution/Extremism vs Reform/Moderation" : "革命/极端手段 vs 改良/中庸之道", category: "politics", scoreRange: [-1, 1] },
      { id: "establishment", name: isEn ? "Establishment vs Populist" : "建制派 vs 民粹派", description: isEn ? "Trust Experts/Elites vs Trust People/Anti-Elite" : "相信专家/精英治国 vs 相信平民/反精英/阴谋论", category: "politics", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "economy",
    name: isEn ? "Economic View" : "经济观点 (Economic View)",
    description: isEn ? "Wealth and Economic System" : "财富观与经济体制倾向",
    labels: [
      { id: "market_vs_gov", name: isEn ? "Market vs Government" : "市场主导 vs 政府干预", description: isEn ? "Invisible Hand vs Macro Control" : "相信“看不见的手” vs 相信宏观调控", category: "economy", scoreRange: [-1, 1] },
      { id: "competition_vs_equality", name: isEn ? "Competition vs Equality" : "自由竞争 vs 平等分配", description: isEn ? "Survival of Fittest vs Common Prosperity/UBI" : "优胜劣汰/社达 vs 共同富裕/UBI", category: "economy", scoreRange: [-1, 1] },
      { id: "speculation_vs_value", name: isEn ? "Speculation vs Value" : "投机 vs 价值", description: isEn ? "Crypto/Hype/Get Rich Quick vs Fundamentals/Long-termism" : "币圈/炒作/暴富心理 vs 基本面/长期主义", category: "economy", scoreRange: [-1, 1] },
      { id: "micro_vs_macro", name: isEn ? "Micro vs Macro" : "微观实操 vs 宏观叙事", description: isEn ? "Side Hustle/Livelihood vs National Destiny/Grand Strategy" : "搞钱/副业/生计 vs 国运/大棋局/汇率", category: "economy", scoreRange: [-1, 1] },
      { id: "real_vs_virtual", name: isEn ? "Real vs Virtual Economy" : "实体经济 vs 虚拟经济", description: isEn ? "Manufacturing/Industry vs Internet/Finance/SaaS" : "制造业/实业救国 vs 互联网/金融/SaaS", category: "economy", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "society",
    name: isEn ? "Social View" : "社会观点 (Social View)",
    description: isEn ? "Social Structure and Conflicts" : "群体矛盾与社会结构",
    labels: [
      { id: "individualism_vs_collectivism", name: isEn ? "Individualism vs Collectivism" : "个人主义 vs 集体主义", description: isEn ? "Self-Interest vs Collective Interest" : "自身权益优先 vs 大局/集体利益优先", category: "society", scoreRange: [-1, 1] },
      { id: "elite_vs_grassroots", name: isEn ? "Elite vs Grassroots" : "精英/奋斗 vs 草根/躺平", description: isEn ? "Wolf Culture/Meritocracy vs Anti-Involution/Lying Flat" : "狼性文化/慕强 vs 反内卷/摆烂", category: "society", scoreRange: [-1, 1] },
      { id: "feminism_vs_patriarchy", name: isEn ? "Feminism vs Patriarchy" : "女权 vs 父权", description: isEn ? "Gender Equality/Radical Feminism vs Traditional Family/RedPill" : "性别平权/激进女权 vs 传统家庭观/红药丸(RedPill)", category: "society", scoreRange: [-1, 1] },
      { id: "urban_vs_rural", name: isEn ? "Urban vs Rural" : "城市 vs 乡土", description: isEn ? "Metropolitan/Centralized vs Small Town/Decentralized" : "一线城市/中心化视角 vs 小镇青年/下沉市场视角", category: "society", scoreRange: [-1, 1] },
      { id: "generational_conflict", name: isEn ? "Generational Conflict" : "代际冲突", description: isEn ? "Gen Z/Rebellion vs Boomer/Hard Work" : "后浪/Z世代/整顿职场 vs 前浪/老一辈/吃苦耐劳", category: "society", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "technology",
    name: isEn ? "Technology View" : "科技观点 (Technology View)",
    description: isEn ? "Attitude towards Technology" : "工具理性与技术态度",
    labels: [
      { id: "open_vs_closed", name: isEn ? "Open vs Closed" : "开放 vs 封闭", description: isEn ? "Open Source/Linux vs Closed Source/Apple/Patent" : "开源/Linux vs 闭源/苹果/专利", category: "technology", scoreRange: [-1, 1] },
      { id: "innovation_vs_security", name: isEn ? "Innovation vs Security" : "创新导向 vs 安全导向", description: isEn ? "Radical Iteration vs Stability/Privacy First" : "激进迭代 vs 稳健/隐私优先", category: "technology", scoreRange: [-1, 1] },
      { id: "optimism_vs_conservatism", name: isEn ? "Tech Optimism vs Conservatism" : "技术乐观 vs 技术保守", description: isEn ? "AI Utopia/Accelerationism vs AI Doomsday/Luddism" : "AI乌托邦/加速主义 vs AI末日论/卢德主义", category: "technology", scoreRange: [-1, 1] },
      { id: "decentralization_vs_centralization", name: isEn ? "Decentralization vs Centralization" : "去中心化 vs 中心化", description: isEn ? "Web3/Blockchain/DAO vs Web2/Platform Monopoly" : "Web3/区块链/DAO vs Web2/平台垄断", category: "technology", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "culture",
    name: isEn ? "Cultural View" : "文化观点 (Cultural View)",
    description: isEn ? "Aesthetics and Beliefs" : "审美与信仰",
    labels: [
      { id: "local_vs_global", name: isEn ? "Local vs Global" : "本土化 vs 全球化/西化", description: isEn ? "Cultural Confidence/Nationalism vs Universal Values/Westernization" : "文化自信/国潮 vs 普世价值/崇洋", category: "culture", scoreRange: [-1, 1] },
      { id: "spiritual_vs_material", name: isEn ? "Spiritual vs Material" : "精神 vs 物质", description: isEn ? "Idealism/Philosophy vs Realism/Consumerism" : "理想主义/哲学 vs 现实主义/消费", category: "culture", scoreRange: [-1, 1] },
      { id: "serious_vs_popular", name: isEn ? "Serious vs Popular" : "严肃 vs 通俗", description: isEn ? "Deep/Art/Niche vs Entertainment/Pop/Mass" : "深度/艺术/小众 vs 娱乐/流行/大众", category: "culture", scoreRange: [-1, 1] },
      { id: "secular_vs_religious", name: isEn ? "Secular vs Religious" : "世俗 vs 宗教/神秘学", description: isEn ? "Materialism/Science/Atheism vs Religion/Metaphysics/Astrology" : "唯物/科学/无神论 vs 宗教/玄学/星座/命理", category: "culture", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "environment",
    name: isEn ? "Environment View" : "环境观点 (Environment View)",
    description: isEn ? "Relationship with Nature" : "人与自然的关系",
    labels: [
      { id: "protection_vs_development", name: isEn ? "Protection vs Development" : "环境保护 vs 经济发展", description: isEn ? "Nature First vs Industry First" : "绿水青山优先 vs 工业产值优先", category: "environment", scoreRange: [-1, 1] },
      { id: "climate_believer_vs_skeptic", name: isEn ? "Climate Believer vs Skeptic" : "气候确信 vs 气候怀疑", description: isEn ? "Climate Crisis is Real vs Hoax/Natural Cycle" : "认为气候变暖是紧急危机 vs 认为是骗局/自然周期", category: "environment", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "entertainment",
    name: isEn ? "Entertainment" : "娱乐偏好 (Entertainment)",
    description: isEn ? "Source of Dopamine" : "多巴胺来源",
    labels: [
      { id: "2d_vs_3d", name: isEn ? "2D vs 3D" : "二次元 vs 三次元", description: isEn ? "Anime/Virtual vs Reality/Celebrity" : "动漫/虚拟 vs 现实/明星", category: "entertainment", scoreRange: [-1, 1] },
      { id: "hardcore_vs_casual", name: isEn ? "Hardcore vs Casual" : "硬核 vs 休闲", description: isEn ? "Geek/Creator vs Consumer/Passerby" : "钻研/婆罗门/创造者 vs 吃瓜/路人/消费者", category: "entertainment", scoreRange: [-1, 1] },
      { id: "niche_vs_mainstream", name: isEn ? "Niche vs Mainstream" : "亚文化 vs 主流", description: isEn ? "Indie/Underground/Cult vs Hit/Trend/Chart" : "独立/地下/邪典(Cult) vs 爆款/跟风/排行榜", category: "entertainment", scoreRange: [-1, 1] }
    ]
  },
  {
    id: "lifestyle_career",
    name: isEn ? "Lifestyle & Career" : "生活与职场 (Lifestyle & Career)",
    description: isEn ? "Life State and Career Path" : "生存状态与发展路径",
    labels: [
      { id: "frugal_vs_luxury", name: isEn ? "Frugal vs Luxury" : "节俭 vs 奢华", description: isEn ? "Minimalism/FIRE vs Consumerism/Exquisite" : "极简/挂逼/FIRE vs 消费主义/精致生活", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "stable_vs_risk", name: isEn ? "Stable vs Risk" : "稳定 vs 风险", description: isEn ? "Civil Servant/Iron Bowl vs Startup/Freelance" : "体制内/考公 vs 创业/自由职业", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "cat_vs_dog", name: isEn ? "Cat Person vs Dog Person" : "猫派 vs 狗派", description: isEn ? "Independent/Indoor vs Enthusiastic/Outdoor" : "独立/宅 vs 热情/户外", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "family_vs_single", name: isEn ? "Family vs Single" : "婚育 vs 单身", description: isEn ? "Parenting/Family vs DINK/Single" : "亲子/鸡娃/家庭琐事 vs 丁克/不婚/单身贵族", category: "lifestyle_career", scoreRange: [-1, 1] },
      { id: "discipline_vs_hedonism", name: isEn ? "Discipline vs Hedonism" : "养生/自律 vs 享乐", description: isEn ? "Fitness/Early Bird vs Night Owl/Foodie/YOLO" : "健身/早起/成分党 vs 熬夜/美食/YOLO", category: "lifestyle_career", scoreRange: [-1, 1] }
    ]
  }
]};

// For backward compatibility if needed, but prefer using getLabelCategories()
export const LABEL_CATEGORIES = getLabelCategories();

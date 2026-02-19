import { AnalysisMode, MacroCategory } from "~types";
import { I18nService } from "./I18nService";
import { calculateFinalLabel } from "./LabelUtils";

interface LabelDefinition {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface LabelGroup {
  id: string;
  name: string;
  labels: LabelDefinition[];
}

// 定义标签组 - Aligned with LabelDefinitions.ts
const LABEL_GROUPS: LabelGroup[] = [
  {
    id: "politics",
    name: "Political Ideology",
    labels: [
      {
        id: "ideology",
        name: "左派 vs 右派|Left vs Right",
        description: "平等/福利优先 vs 效率/增长优先",
        weight: 1.0,
      },
      {
        id: "authority",
        name: "自由意志 vs 威权主义|Libertarian vs Authoritarian",
        description: "小政府/自由/去监管 vs 大政府/秩序/监管",
        weight: 0.9,
      },
      {
        id: "change",
        name: "进步派 vs 传统派|Progressive vs Traditional",
        description: "激进改革/Woke文化 vs 维护传统/保守价值观",
        weight: 0.9,
      },
      {
        id: "geopolitics",
        name: "全球主义 vs 民族主义|Globalism vs Nationalism",
        description: "全球一体化/多元包容 vs 本国优先/排外",
        weight: 0.9,
      },
      {
        id: "radicalism",
        name: "激进派 vs 温和派|Radical vs Moderate",
        description: "革命/极端手段 vs 改良/中庸之道",
        weight: 0.8,
      },
      {
        id: "establishment",
        name: "建制派 vs 民粹派|Establishment vs Populist",
        description: "相信专家/精英治国 vs 相信平民/反精英/阴谋论",
        weight: 0.8,
      },
    ],
  },
  {
    id: "economy",
    name: "Economic Views",
    labels: [
      {
        id: "market_vs_gov",
        name: "市场主导 vs 政府干预|Market vs Government",
        description: "相信“看不见的手” vs 相信宏观调控",
        weight: 1.0,
      },
      {
        id: "competition_vs_equality",
        name: "自由竞争 vs 平等分配|Competition vs Equality",
        description: "优胜劣汰/社达 vs 共同富裕/UBI",
        weight: 0.9,
      },
      {
        id: "speculation_vs_value",
        name: "投机 vs 价值|Speculation vs Value",
        description: "币圈/炒作/暴富心理 vs 基本面/长期主义",
        weight: 0.8,
      },
      {
        id: "micro_vs_macro",
        name: "微观实操 vs 宏观叙事|Micro vs Macro",
        description: "搞钱/副业/生计 vs 国运/大棋局/汇率",
        weight: 0.7,
      },
      {
        id: "real_vs_virtual",
        name: "实体经济 vs 虚拟经济|Real vs Virtual Economy",
        description: "制造业/实业救国 vs 互联网/金融/SaaS",
        weight: 0.7,
      },
    ],
  },
  {
    id: "society",
    name: "Social Values",
    labels: [
      {
        id: "individualism_vs_collectivism",
        name: "个人主义 vs 集体主义|Individualism vs Collectivism",
        description: "自身权益优先 vs 大局/集体利益优先",
        weight: 1.0,
      },
      {
        id: "elite_vs_grassroots",
        name: "精英 vs 草根|Elite vs Grassroots",
        description: "狼性文化/慕强 vs 反内卷/摆烂",
        weight: 0.9,
      },
      {
        id: "feminism_vs_patriarchy",
        name: "女权 vs 父权|Feminism vs Patriarchy",
        description: "性别平权/激进女权 vs 传统家庭观/红药丸(RedPill)",
        weight: 0.9,
      },
      {
        id: "urban_vs_rural",
        name: "城市 vs 乡土|Urban vs Rural",
        description: "一线城市/中心化视角 vs 小镇青年/下沉市场视角",
        weight: 0.8,
      },
      {
        id: "generational_conflict",
        name: "代际冲突|Generational Conflict",
        description: "后浪/Z世代/整顿职场 vs 前浪/老一辈/吃苦耐劳",
        weight: 0.8,
      },
    ],
  },
  {
    id: "technology",
    name: "Technology & Innovation",
    labels: [
      {
        id: "open_vs_closed",
        name: "开放 vs 封闭|Open vs Closed",
        description: "开源/Linux vs 闭源/苹果/专利",
        weight: 0.8,
      },
      {
        id: "innovation_vs_security",
        name: "创新导向 vs 安全导向|Innovation vs Security",
        description: "激进迭代 vs 稳健/隐私优先",
        weight: 0.9,
      },
      {
        id: "optimism_vs_conservatism",
        name: "技术乐观 vs 技术保守|Tech Optimism vs Conservatism",
        description: "AI乌托邦/加速主义 vs AI末日论/卢德主义",
        weight: 0.8,
      },
      {
        id: "decentralization_vs_centralization",
        name: "去中心化 vs 中心化|Decentralization vs Centralization",
        description: "Web3/区块链/DAO vs Web2/平台垄断",
        weight: 0.8,
      },
    ],
  },
  {
    id: "culture",
    name: "Culture & Lifestyle",
    labels: [
      {
        id: "local_vs_global",
        name: "本土化 vs 全球化|Local vs Global",
        description: "文化自信/国潮 vs 普世价值/崇洋",
        weight: 0.8,
      },
      {
        id: "spiritual_vs_material",
        name: "精神 vs 物质|Spiritual vs Material",
        description: "理想主义/哲学 vs 现实主义/消费",
        weight: 0.8,
      },
      {
        id: "serious_vs_popular",
        name: "严肃 vs 通俗|Serious vs Popular",
        description: "深度/艺术/小众 vs 娱乐/流行/大众",
        weight: 0.7,
      },
      {
        id: "secular_vs_religious",
        name: "世俗 vs 宗教|Secular vs Religious",
        description: "唯物/科学/无神论 vs 宗教/玄学/星座/命理",
        weight: 0.7,
      },
    ],
  },
  {
    id: "environment",
    name: "Environment",
    labels: [
      {
        id: "protection_vs_development",
        name: "环境保护 vs 经济发展|Protection vs Development",
        description: "绿水青山优先 vs 工业产值优先",
        weight: 0.8,
      },
      {
        id: "climate_believer_vs_skeptic",
        name: "气候确信 vs 气候怀疑|Climate Believer vs Skeptic",
        description: "认为气候变暖是紧急危机 vs 认为是骗局/自然周期",
        weight: 0.8,
      },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    labels: [
      {
        id: "2d_vs_3d",
        name: "二次元 vs 三次元|2D vs 3D",
        description: "动漫/虚拟 vs 现实/明星",
        weight: 0.8,
      },
      {
        id: "hardcore_vs_casual",
        name: "硬核 vs 休闲|Hardcore vs Casual",
        description: "钻研/婆罗门/创造者 vs 吃瓜/路人/消费者",
        weight: 0.8,
      },
      {
        id: "niche_vs_mainstream",
        name: "亚文化 vs 主流|Niche vs Mainstream",
        description: "独立/地下/邪典(Cult) vs 爆款/跟风/排行榜",
        weight: 0.8,
      },
    ],
  },
  {
    id: "lifestyle_career",
    name: "Lifestyle & Career",
    labels: [
      {
        id: "frugal_vs_luxury",
        name: "节俭 vs 奢华|Frugal vs Luxury",
        description: "极简/挂逼/FIRE vs 消费主义/精致生活",
        weight: 0.8,
      },
      {
        id: "stable_vs_risk",
        name: "稳定 vs 风险|Stable vs Risk",
        description: "体制内/考公 vs 创业/自由职业",
        weight: 0.9,
      },
      {
        id: "cat_vs_dog",
        name: "猫派 vs 狗派|Cat Person vs Dog Person",
        description: "独立/宅 vs 热情/户外",
        weight: 0.6,
      },
      {
        id: "family_vs_single",
        name: "婚育 vs 单身|Family vs Single",
        description: "亲子/鸡娃/家庭琐事 vs 丁克/不婚/单身贵族",
        weight: 0.8,
      },
      {
        id: "discipline_vs_hedonism",
        name: "自律 vs 享乐|Discipline vs Hedonism",
        description: "健身/早起/成分党 vs 熬夜/美食/YOLO",
        weight: 0.8,
      },
    ],
  },
];

export class LabelService {
  private static instance: LabelService;
  private labels: LabelDefinition[] = [];
  private labelMap: Map<string, LabelDefinition> = new Map();
  private static CORE_CATEGORY_IDS: Array<LabelGroup["id"]> = [
    "politics",
    "society",
  ];

  private constructor() {
    this.initializeLabels();
  }

  public static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService();
    }
    return LabelService.instance;
  }

  private initializeLabels() {
    this.labels = [];
    LABEL_GROUPS.forEach((group) => {
      group.labels.forEach((label) => {
        this.labels.push(label);
        this.labelMap.set(label.id, label);
      });
    });
  }

  public getAllLabels(): LabelDefinition[] {
    return this.labels;
  }

  public getLabelById(id: string): LabelDefinition | undefined {
    return this.labelMap.get(id);
  }

  public getCategories(): LabelGroup[] {
    return LABEL_GROUPS;
  }

  public getCategoryById(id: string): LabelGroup | undefined {
    return LABEL_GROUPS.find((group) => group.id === id);
  }

  public getLabelsByCategory(categoryId: string): LabelDefinition[] {
    const category = this.getCategoryById(categoryId);
    if (!category) {
      return [];
    }
    return category.labels;
  }

  public getLabelsForContext(
    category: MacroCategory,
    mode: AnalysisMode = "balanced",
  ): string {
    // 获取基础标签（核心标签）
    const baseLabels = this.getCoreLabels();

    // 根据类别获取特定标签
    const categoryLabels = this.getCategoryLabels(category);

    // 根据模式调整标签
    const filteredLabels = this.filterLabelsByMode(
      baseLabels.concat(categoryLabels),
      mode,
    );

    // 格式化输出
    return this.formatLabels(filteredLabels);
  }

  public getStandardLabelsForLLM(): string {
    const allGroups = this.getCategories();
    let result = "标准标签系统:\n";

    allGroups.forEach((group) => {
      result += `\n分类: ${group.name}\n`;
      result += `  标签:\n`;
      group.labels.forEach((label) => {
        const nameParts = label.name.split("|");
        const displayName =
          I18nService.getLanguage() === "en-US"
            ? nameParts[1] || nameParts[0]
            : nameParts[0] || nameParts[1];
        result += `    - ${label.id}: ${displayName} (${label.description})\n`;
      });
    });

    return result;
  }

  private getCoreLabels(): LabelDefinition[] {
    const coreLabels: LabelDefinition[] = [];
    for (const categoryId of LabelService.CORE_CATEGORY_IDS) {
      coreLabels.push(...this.getLabelsByCategory(categoryId));
    }
    return coreLabels;
  }

  private getCategoryLabels(category: MacroCategory): LabelDefinition[] {
    switch (category) {
      case "politics":
        return this.getLabelsByCategory("politics");
      case "economy":
        return this.getLabelsByCategory("economy");
      case "society":
        return this.getLabelsByCategory("society");
      case "technology":
        return this.getLabelsByCategory("technology");
      case "culture":
        return this.getLabelsByCategory("culture");
      case "environment":
        return this.getLabelsByCategory("environment");
      case "entertainment":
        return this.getLabelsByCategory("entertainment");
      case "lifestyle_career":
        return this.getLabelsByCategory("lifestyle_career");
      default:
        return this.labels;
    }
  }

  private filterLabelsByMode(
    labels: LabelDefinition[],
    mode: AnalysisMode,
  ): LabelDefinition[] {
    // Remove duplicates
    const uniqueLabels = Array.from(
      new Map(labels.map((l) => [l.id, l])).values(),
    );

    switch (mode) {
      case "fast":
        // 快速模式只返回最重要的标签
        return uniqueLabels.filter((l) => l.weight >= 0.9);
      case "balanced":
        // 平衡模式返回权重中等及以上的标签
        return uniqueLabels.filter((l) => l.weight >= 0.7);
      case "deep":
        // 深度模式返回所有标签
        return uniqueLabels;
    }
  }

  private formatLabels(labels: LabelDefinition[]): string {
    const isEn = I18nService.getLanguage() === "en-US";

    return labels
      .map((label) => {
        const nameParts = label.name.split("|");
        const displayName = isEn
          ? nameParts[1] || nameParts[0]
          : nameParts[0] || nameParts[1];
        return `- 【${label.id}】: ${displayName} (${label.description})`;
      })
      .join("\n");
  }

  public refreshCategories() {
    // 当语言发生变化时，可能需要重新初始化标签
    // 目前我们只需要确保语言服务已初始化
    I18nService.getLanguage();
  }

  // 分析内容并返回标签分数
  public analyzeContentWithStandardLabels(
    content: string,
    category: string = "general",
  ): { category: string; labels: Array<{ label: string; score: number }> } {
    // 这是一个简化版本，实际实现可能会更复杂
    // 使用启发式规则基于内容分析标签倾向
    const contentLower = content.toLowerCase();
    const results: Array<{ label: string; score: number }> = [];

    for (const label of this.labels) {
      const score = this.calculateScoreForLabel(label, contentLower);
      if (Math.abs(score) > 0.1) {
        // 只返回有一定倾向性的标签
        results.push({ label: label.id, score });
      }
    }

    return {
      category,
      labels: results,
    };
  }

  private calculateScoreForLabel(
    label: LabelDefinition,
    contentLower: string,
  ): number {
    // 根据标签ID和内容计算倾向性分数
    // 这是一个简化的启发式方法，实际实现可能会使用ML模型

    // 简单的关键词匹配逻辑
    const nameParts = label.name.split("|");
    const chineseTerms = (nameParts[0] || "").split(/[|，,]/);
    const englishTerms = (nameParts[1] || "").split(/[|-]/);

    let positiveCount = 0;
    let negativeCount = 0;

    // 检查描述中的关键词
    if (label.description.toLowerCase().includes("vs")) {
      const parts = label.description.split(/vs/i);
      if (parts.length >= 2) {
        const leftSide = parts[0].toLowerCase();
        const rightSide = parts[1].toLowerCase();

        // 简单的包含检查
        if (contentLower.includes(leftSide.trim())) negativeCount++;
        if (contentLower.includes(rightSide.trim())) positiveCount++;
      }
    }

    // 检查ID相关的特定关键词
    switch (label.id) {
      case "ideology":
        if (contentLower.includes("左") || contentLower.includes("left"))
          positiveCount++;
        if (contentLower.includes("右") || contentLower.includes("right"))
          negativeCount++;
        break;
      case "market_vs_gov":
        if (contentLower.includes("市场") || contentLower.includes("market"))
          positiveCount++;
        if (contentLower.includes("政府") || contentLower.includes("gov"))
          negativeCount++;
        break;
      // 可以添加更多特定标签的逻辑
    }

    if (positiveCount > 0 || negativeCount > 0) {
      return (
        (positiveCount - negativeCount) / (positiveCount + negativeCount + 1)
      ); // +1 防止除零，并稍微平滑分数
    }

    return 0; // 默认无明显倾向
  }
}

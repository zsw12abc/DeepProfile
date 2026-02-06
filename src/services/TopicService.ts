import { LLMService } from "./LLMService";
import type { MacroCategory } from "~types";
import { I18nService } from "./I18nService";

const CATEGORIES: MacroCategory[] = [
  "politics",
  "economy",
  "society",
  "technology",
  "culture",
  "environment",
  "entertainment",
  "lifestyle_career",
];

const CATEGORY_KEYWORDS: Record<MacroCategory, string[]> = {
  entertainment: [
    "娱乐",
    "游戏",
    "二次元",
    "动漫",
    "acgn",
    "明星",
    "体育",
    "足球",
    "篮球",
    "电影",
    "音乐",
    "亚文化",
    "小众",
    "邪典",
    "entertainment",
    "game",
    "movie",
    "music",
    "sport",
    "anime",
    "原神",
    "王者荣耀",
    "英雄联盟",
    "lol",
    "dota",
    "steam",
    "switch",
    "ps5",
    "xbox",
    "任天堂",
    "nba",
    "cba",
    "世界杯",
    "奥运会",
    "梅西",
    "c罗",
    "詹姆斯",
    "科比",
    "演唱会",
    "综艺",
  ],
  technology: [
    "技术",
    "科技",
    "编程",
    "软件",
    "硬件",
    "互联网",
    "ai",
    "人工智能",
    "算法",
    "数据",
    "开源",
    "github",
    "git",
    "linux",
    "windows",
    "mac",
    "apple",
    "google",
    "microsoft",
    "developer",
    "programming",
    "software",
    "hardware",
    "internet",
    "algorithm",
    "database",
    "cloud",
    "docker",
    "kubernetes",
    "devops",
    "security",
    "cybersecurity",
    "blockchain",
  ],
  economy: [
    "经济",
    "金融",
    "股票",
    "基金",
    "投资",
    "理财",
    "货币",
    "银行",
    "股市",
    "债券",
    "房地产",
    "房价",
    "房贷",
    "利率",
    "通胀",
    "gdp",
    "经济",
    "财政",
    "税收",
    "预算",
    "economy",
    "finance",
    "stock",
    "investment",
    "bank",
    "mortgage",
    "interest",
    "inflation",
    "property",
    "real estate",
    "bond",
    "currency",
    "banking",
    "trading",
    "fund",
  ],
  politics: [
    "政治",
    "政府",
    "党派",
    "选举",
    "总统",
    "总理",
    "国会",
    "议会",
    "法律",
    "政策",
    "宪法",
    "民主",
    "专制",
    "人权",
    "自由",
    "左派",
    "右派",
    "保守",
    "自由派",
    "politics",
    "government",
    "party",
    "election",
    "president",
    "prime minister",
    "congress",
    "parliament",
    "law",
    "policy",
    "constitution",
    "democracy",
    "dictatorship",
    "human rights",
  ],
  society: [
    "社会",
    "社会问题",
    "社会治理",
    "民生",
    "社会现象",
    "社会保障",
    "社保",
    "医保",
    "社会福利",
    "家庭",
    "婚姻",
    "生育",
    "养老",
    "就业",
    "失业",
    "工资",
    "贫困",
    "社会阶层",
    "社会流动",
    "社会矛盾",
    "社会公平",
    "社会正义",
    "社会建设",
    "社会管理",
    "性别",
    "女权",
    "society",
    "social",
    "social issue",
    "social governance",
    "social welfare",
    "social phenomenon",
    "family",
    "marriage",
    "employment",
    "social mobility",
    "social justice",
    "social equity",
    "social construction",
  ],
  culture: [
    "文化",
    "艺术",
    "文学",
    "小说",
    "诗歌",
    "绘画",
    "书法",
    "摄影",
    "设计",
    "时尚",
    "传统",
    "习俗",
    "节日",
    "宗教",
    "哲学",
    "思想",
    "信仰",
    "价值观",
    "道德",
    "文教",
    "culture",
    "art",
    "literature",
    "novel",
    "poetry",
    "painting",
    "photography",
    "design",
    "fashion",
    "tradition",
    "custom",
    "festival",
    "religion",
    "philosophy",
    "culture",
  ],
  lifestyle_career: [
    "工作",
    "职业",
    "职场",
    "同事",
    "老板",
    "公司",
    "企业",
    "创业",
    "生意",
    "商业",
    "生活",
    "日常生活",
    "个人生活",
    "家务",
    "做饭",
    "饮食",
    "健康",
    "运动",
    "健身",
    "旅游",
    "爱好",
    "求职",
    "面试",
    "职业生涯",
    "工作生活",
    "work life",
    "life balance",
    "work",
    "job",
    "career",
    "colleague",
    "boss",
    "company",
    "business",
    "startup",
    "daily life",
    "personal life",
    "home",
    "cooking",
    "diet",
    "health",
    "exercise",
    "travel",
    "hobby",
    "job hunting",
    "interview",
    "career path",
    "work-life",
    "work life balance",
  ],
  environment: [
    "环境",
    "环保",
    "污染",
    "气候",
    "天气",
    "生态",
    "自然",
    "动物",
    "植物",
    "森林",
    "海洋",
    "河流",
    "空气",
    "水质",
    "垃圾",
    "回收",
    "绿色",
    "可持续",
    "碳排放",
    "environment",
    "pollution",
    "climate",
    "weather",
    "ecology",
    "nature",
    "animal",
    "plant",
    "forest",
    "ocean",
    "river",
    "air",
    "water",
    "waste",
    "green",
    "carbon",
  ],
  general: [],
};

const LLM_CLASSIFICATION_CACHE_TTL_MS = 5 * 60 * 1000;
const LLM_CLASSIFICATION_CACHE_MAX = 200;

export class TopicService {
  private static llmCache = new Map<
    string,
    { category: MacroCategory; expiresAt: number }
  >();

  static classify(context: any): MacroCategory {
    if (!context) return "general";

    // Ensure text is a string and convert to lowercase
    let text = "";
    try {
      text = String(context).toLowerCase();
    } catch (e) {
      return "general";
    }

    // 1. 娱乐 (Entertainment) - 高优先级，避免与文化混淆
    if (this.matches(text, CATEGORY_KEYWORDS.entertainment)) {
      return "entertainment";
    }

    // 2. 技术 (Technology) - 避免与文化混淆
    if (this.matches(text, CATEGORY_KEYWORDS.technology)) {
      return "technology";
    }

    // 3. 经济 (Economy)
    if (this.matches(text, CATEGORY_KEYWORDS.economy)) {
      return "economy";
    }

    // 4. 政治 (Politics)
    if (this.matches(text, CATEGORY_KEYWORDS.politics)) {
      return "politics";
    }

    // 5. 社会 (Society) - 需要更精确的关键词，避免与文化、生活混淆
    if (this.matches(text, CATEGORY_KEYWORDS.society)) {
      return "society";
    }

    // 6. 文化 (Culture) - 在社会之后，避免冲突
    if (this.matches(text, CATEGORY_KEYWORDS.culture)) {
      return "culture";
    }

    // 7. 生活/职业 (Lifestyle/Career) - 需要明确的生活/职业关键词
    if (this.matches(text, CATEGORY_KEYWORDS.lifestyle_career)) {
      return "lifestyle_career";
    }

    // 8. 环境 (Environment)
    if (this.matches(text, CATEGORY_KEYWORDS.environment)) {
      return "environment";
    }

    return "general";
  }

  static async classifyWithConfidence(
    context: string,
  ): Promise<{ category: MacroCategory; confidence: number }> {
    if (!context) return { category: "general", confidence: 1.0 };

    // 使用关键词匹配作为初步分类
    const keywordCategory = this.classify(context);

    // 计算关键词匹配的置信度
    const keywordConfidence = this.calculateKeywordConfidence(
      context,
      keywordCategory,
    );

    try {
      // 使用LLM进行二次确认
      const llmCategory = await this.classifyWithLLM(context);

      // 比较两种方法的结果
      if (keywordCategory === llmCategory) {
        // 如果两种方法一致，置信度更高
        return {
          category: keywordCategory,
          confidence: Math.min(1.0, keywordConfidence + 0.2),
        };
      } else {
        // 如果结果不同，返回LLM结果，置信度稍低
        return { category: llmCategory, confidence: 0.7 };
      }
    } catch (error) {
      // 如果LLM分类失败，返回关键词分类结果
      return { category: keywordCategory, confidence: keywordConfidence };
    }
  }

  private static calculateKeywordConfidence(
    context: string,
    category: MacroCategory,
  ): number {
    if (!context) return 0.0;

    const text = String(context).toLowerCase();
    let matchedKeywordsCount = 0;

    // 根据类别统计匹配的关键词数量
    matchedKeywordsCount = this.countMatches(
      text,
      CATEGORY_KEYWORDS[category] || [],
    );

    // 基础置信度：0.5，每匹配一个关键词增加0.1，最多到0.9
    return Math.min(0.9, 0.5 + matchedKeywordsCount * 0.1);
  }

  private static countMatches(text: string, keywords: string[]): number {
    let count = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        count++;
      }
    }
    return count;
  }

  private static matches(text: string, keywords: string[]): boolean {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  static getCategoryName(category: MacroCategory): string {
    const isEn = I18nService.getLanguage() === "en-US";

    const categoryNames: Record<MacroCategory, { en: string; zh: string }> = {
      politics: { en: "Politics", zh: "政治" },
      economy: { en: "Economy", zh: "经济" },
      society: { en: "Society", zh: "社会" },
      technology: { en: "Technology", zh: "技术" },
      culture: { en: "Culture", zh: "文化" },
      environment: { en: "Environment", zh: "环境" },
      entertainment: { en: "Entertainment", zh: "娱乐" },
      lifestyle_career: { en: "Lifestyle & Career", zh: "生活与职业" },
      general: { en: "General", zh: "综合" },
    };

    return isEn ? categoryNames[category].en : categoryNames[category].zh;
  }

  static async classifyWithLLM(context: string): Promise<MacroCategory> {
    if (!context) return "general";

    const cacheKey = context.trim().toLowerCase();
    const cached = this.llmCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.category;
    } else if (cached) {
      this.llmCache.delete(cacheKey);
    }

    // 使用 LLM 进行更智能的分类
    const prompt = `请将以下文本内容归类到以下8个领域之一：
- politics: 政治相关话题
- economy: 经济金融话题
- society: 社会民生话题
- technology: 科技话题
- culture: 文化艺术话题
- environment: 环境话题
- entertainment: 娱乐话题
- lifestyle_career: 生活职业话题

如果都不符合，归类为 general。

请直接返回类别名称，不要添加其他文字。

文本内容：
${context}`;

    try {
      const response = await LLMService.generateRawText(prompt);
      const category = response.trim().toLowerCase();

      // 验证返回的类别是否有效
      const resolved = CATEGORIES.includes(category as MacroCategory)
        ? (category as MacroCategory)
        : "general";

      this.updateCache(cacheKey, resolved);
      return resolved;
    } catch (error) {
      if ((error as any)?.isMissingApiKey) {
        return "general";
      }
      console.error("LLM classification failed:", error);
      return "general";
    }
  }

  static clearLLMCache(): void {
    this.llmCache.clear();
  }

  private static updateCache(cacheKey: string, category: MacroCategory): void {
    if (this.llmCache.size >= LLM_CLASSIFICATION_CACHE_MAX) {
      const oldestKey = this.llmCache.keys().next().value;
      if (oldestKey) {
        this.llmCache.delete(oldestKey);
      }
    }

    this.llmCache.set(cacheKey, {
      category,
      expiresAt: Date.now() + LLM_CLASSIFICATION_CACHE_TTL_MS,
    });
  }
}

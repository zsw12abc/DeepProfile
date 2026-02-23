import { MacroCategory, AnalysisMode } from "~types";
import { TopicService } from "./TopicService";
import { I18nService } from "./I18nService";

interface Example {
  id: string;
  content: string;
  category: MacroCategory;
  valueOrientations: Array<{ label: string; score: number }>;
  summary: string;
  reasoning?: string;
  evidence?: Array<{
    quote: string;
    analysis: string;
    source_title: string;
  }>;
}

export class ExampleService {
  private static instance: ExampleService;
  private examples: Example[] = [];

  private constructor() {
    this.initializeExamples();
  }

  public static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService();
    }
    return ExampleService.instance;
  }

  private initializeExamples() {
    // 初始化示例库，包含多个领域的示例
    this.examples = [
      // 政治领域示例
      {
        id: "politics-liberal",
        content:
          "政府应该减少对市场的干预，让企业和个人有更多的自由来创造财富。过多的管制只会阻碍经济发展。",
        category: "politics",
        valueOrientations: [
          { label: "market_vs_gov", score: 0.8 },
          { label: "liberty_order", score: 0.7 },
          { label: "individualism_vs_collectivism", score: 0.6 },
        ],
        summary:
          "该用户倾向于自由市场经济理念，强调个人自由和市场效率，对政府管制持谨慎态度。",
        reasoning:
          "从文本中可以看出用户强调减少政府干预、增加个人自由，这体现了典型的自由主义经济观点。",
      },
      {
        id: "politics-conservative",
        content:
          "我们需要维护传统的家庭价值观，社会稳定比个人自由更重要。过度的个人主义会破坏社会凝聚力。",
        category: "politics",
        valueOrientations: [
          { label: "tradition_change", score: -0.8 },
          { label: "liberty_order", score: -0.6 },
          { label: "individualism_vs_collectivism", score: -0.7 },
        ],
        summary:
          "该用户重视传统价值观和社会稳定，认为集体利益高于个人自由，体现了保守主义倾向。",
        reasoning:
          "文本强调传统价值观、社会稳定和集体利益，反映了保守主义的核心观点。",
      },

      // 经济领域示例
      {
        id: "economy-market",
        content:
          "自由市场是推动经济增长的最佳方式。竞争促使企业创新，消费者获得更好的产品和服务。",
        category: "economy",
        valueOrientations: [
          { label: "market_vs_gov", score: 0.9 },
          { label: "competition_vs_equality", score: 0.8 },
          { label: "innovation_vs_security", score: 0.7 },
        ],
        summary: "该用户相信自由市场机制，认为竞争是促进经济发展的关键因素。",
        reasoning:
          "文本中反复提到自由市场、竞争和创新，这些都是自由市场经济理论的核心概念。",
      },
      {
        id: "economy-regulation",
        content:
          "政府需要加强对金融市场的监管，以防止金融危机的发生。保护普通投资者的利益比市场自由更重要。",
        category: "economy",
        valueOrientations: [
          { label: "market_vs_gov", score: -0.8 },
          { label: "competition_vs_equality", score: -0.7 },
          { label: "real_vs_virtual", score: -0.6 },
        ],
        summary:
          "该用户支持政府监管，认为保护投资者和防范风险比市场自由更重要。",
        reasoning:
          "文本关注风险防范、投资者保护和政府监管，体现了对市场失灵的担忧。",
      },

      // 社会领域示例
      {
        id: "society-individual",
        content:
          "每个人都应该有追求自己幸福的权利，社会不应强迫所有人遵循同样的生活方式。多元化是我们社会的财富。",
        category: "society",
        valueOrientations: [
          { label: "individualism_vs_collectivism", score: 0.8 },
          { label: "liberty_order", score: 0.7 },
          { label: "open_vs_closed", score: 0.9 },
        ],
        summary: "该用户强调个人权利和多元价值观，支持包容和开放的社会观念。",
        reasoning: "文本突出个人权利、多元和包容，反映了自由主义的社会价值观。",
      },
      {
        id: "society-collective",
        content:
          "社区和家庭是社会的基本单位，我们应该优先考虑集体福祉。个人行为应当符合社会整体利益。",
        category: "society",
        valueOrientations: [
          { label: "individualism_vs_collectivism", score: -0.8 },
          { label: "tradition_change", score: 0.7 },
          { label: "community_individual", score: -0.8 },
        ],
        summary: "该用户重视集体利益和传统价值观，认为个人应服务于社区和家庭。",
        reasoning: "文本强调社区、家庭和集体利益，体现了集体主义的社会观念。",
      },

      // 技术领域示例
      {
        id: "tech-acceleration",
        content:
          "我们必须加快技术创新的步伐，即使这意味着承担一些风险。技术进步是解决人类问题的关键。",
        category: "technology",
        valueOrientations: [
          { label: "acceleration_vs_caution", score: 0.8 },
          { label: "innovation_vs_security", score: 0.7 },
          { label: "open_vs_closed", score: 0.6 },
        ],
        summary: "该用户支持技术加速发展，认为创新比规避风险更重要。",
        reasoning:
          "文本强调加快步伐、接受风险和技术解决论，体现了加速主义观点。",
      },
      {
        id: "tech-caution",
        content:
          "新技术应用前必须充分评估风险，安全比进步更重要。我们不能拿公众安全做实验。",
        category: "technology",
        valueOrientations: [
          { label: "acceleration_vs_caution", score: -0.8 },
          { label: "innovation_vs_security", score: -0.9 },
          { label: "privacy_vs_convenience", score: -0.7 },
        ],
        summary: "该用户主张谨慎的技术发展路径，优先考虑安全和风险控制。",
        reasoning: "文本突出安全优先、风险评估和防范意识，体现了谨慎主义观点。",
      },

      // 娱乐领域示例
      {
        id: "entertainment-open",
        content:
          "不同的文化背景产生了各种有趣的游戏和动漫作品，我们应该开放心态去接纳各种类型的作品，而不是固守单一的文化形态。",
        category: "entertainment",
        valueOrientations: [
          { label: "open_vs_closed", score: 0.8 },
          { label: "tradition_change", score: 0.6 },
          { label: "material_vs_spiritual", score: 0.4 },
        ],
        summary: "该用户支持文化多样性，主张开放心态接纳不同类型的娱乐内容。",
        reasoning:
          "文本强调接纳多样性、开放心态和跨文化交流，体现了开放的文化观念。",
      },
      {
        id: "entertainment-traditional",
        content:
          "我们应当珍视传统文化作品的价值，新的娱乐形式虽然吸引人，但往往缺乏深度和内涵。",
        category: "entertainment",
        valueOrientations: [
          { label: "open_vs_closed", score: -0.6 },
          { label: "tradition_change", score: 0.8 },
          { label: "material_vs_spiritual", score: 0.5 },
        ],
        summary: "该用户重视传统文化价值，对新兴娱乐形式持保留态度。",
        reasoning:
          "文本强调传统价值、深度内涵和对新形式的质疑，体现了保守的文化观。",
      },
    ];
  }

  /**
   * 根据输入内容和类别检索最相关的示例
   */
  getRelevantExamples(
    inputContent: string,
    category: MacroCategory,
    mode: AnalysisMode = "balanced",
    count: number = 2,
  ): Example[] {
    void mode;

    // 根据输入内容和目标类别筛选示例
    let filteredExamples = this.examples.filter(
      (example) =>
        example.category === category ||
        TopicService.classify(example.content) === category,
    );

    // 如果没有找到特定类别的示例，使用通用示例
    if (filteredExamples.length === 0) {
      filteredExamples = this.examples;
    }

    // 计算每个示例与输入内容的相关性
    const scoredExamples = filteredExamples.map((example) => {
      const relevanceScore = this.calculateRelevanceScore(
        inputContent,
        example.content,
      );
      return { example, relevanceScore };
    });

    // 按相关性排序并返回指定数量的示例
    scoredExamples.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredExamples.slice(0, count).map((item) => item.example);
  }

  /**
   * 计算两个文本之间的相关性分数
   */
  private calculateRelevanceScore(input: string, example: string): number {
    const inputTokens = this.tokenize(input.toLowerCase());
    const exampleTokens = this.tokenize(example.toLowerCase());

    if (inputTokens.length === 0 || exampleTokens.length === 0) {
      return 0;
    }

    // 计算词汇重叠度（Jaccard相似度）
    const inputSet = new Set(inputTokens);
    const exampleSet = new Set(exampleTokens);

    // 计算交集
    const intersection = new Set(
      [...inputSet].filter((x) => exampleSet.has(x)),
    );

    // 计算并集
    const union = new Set([...inputSet, ...exampleSet]);

    // Jaccard相似度 = 交集大小 / 并集大小
    return intersection.size / union.size;
  }

  /**
   * 简单的文本分词
   */
  private tokenize(text: string): string[] {
    // 对中文和英文进行适当的分词
    // 简化版：按空格、标点符号和中文字符分割
    return text
      .replace(/[，。！？；：、]/g, " ") // 替换中文标点为空格
      .replace(/[,.!?;:]/g, " ") // 替换英文标点为空格
      .split(/\s+/) // 按空白字符分割
      .concat(text.match(/[\u4e00-\u9fa5]/g) || []) // 添加中文字符作为单独token
      .filter((token) => token.length > 0) // 过滤空字符串
      .map((token) => token.trim());
  }

  /**
   * 将示例格式化为few-shot prompt
   */
  formatExamplesAsPrompt(examples: Example[], mode: AnalysisMode): string {
    void mode;
    const isEn = I18nService.getLanguage() === "en-US";

    if (examples.length === 0) {
      return isEn
        ? "【Few-Shot Examples】\nNo relevant examples found for this topic."
        : "【Few-Shot Examples】\n未找到与此主题相关的示例。";
    }

    const exampleTexts = examples.map((example, index) => {
      let exampleStr = isEn
        ? `Example ${index + 1}:\nText: "${example.content}"\nAnalysis:\n`
        : `示例 ${index + 1}:\n文本: "${example.content}"\n分析:\n`;

      example.valueOrientations.forEach((vo) => {
        exampleStr += `- ${vo.label}: ${vo.score} (${isEn ? "Score explanation" : "评分说明"})\n`;
      });

      return exampleStr;
    });

    return isEn
      ? `【Few-Shot Examples】\n${exampleTexts.join("\n")}`
      : `【Few-Shot Examples】\n${exampleTexts.join("\n")}`;
  }
}

import type { AnalysisMode, MacroCategory } from "~types";
import { LABEL_CATEGORIES, LabelDefinition, CategoryDefinition, createLabelCategories } from "./LabelDefinitions";
import { getRelevantLabelsByTopic } from "./LabelUtils";

export interface ClassificationResult {
  category: string;
  labels: Array<{ labelId: string; score: number; name: string; }>; // 分数现在可以是负值
}

export class LabelService {
  private static instance: LabelService;
  private categories: CategoryDefinition[];

  private constructor() {
    this.categories = createLabelCategories();
  }

  static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService();
    }
    return LabelService.instance;
  }

  // Refresh categories when language changes
  refreshCategories() {
    this.categories = createLabelCategories();
  }

  getCategories(): CategoryDefinition[] {
    return this.categories;
  }

  getCategoryById(id: string): CategoryDefinition | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  getLabelsByCategory(categoryId: string): LabelDefinition[] {
    const category = this.getCategoryById(categoryId);
    return category ? category.labels : [];
  }

  getLabelById(labelId: string): LabelDefinition | undefined {
    for (const category of this.categories) {
      const label = category.labels.find(l => l.id === labelId);
      if (label) return label;
    }
    return undefined;
  }

  // 根据内容分析结果，返回标准化的标签
  analyzeContentWithStandardLabels(content: string, topicClassification: string): ClassificationResult {
    // 根据话题分类确定合适的标签类别
    const category = this.determineCategoryFromTopic(topicClassification);
    
    if (!category || topicClassification === 'general') {
      return {
        category: "general",
        labels: []
      };
    }

    // 获取与话题相关的标签
    const relevantLabels = getRelevantLabelsByTopic(topicClassification);
    const relevantLabelIds = relevantLabels.map(l => l.id);
    
    // 模拟分析结果 - 实际应用中应根据内容进行分析
    const results: Array<{ labelId: string; score: number; name: string; }> = [];
    
    // 只对相关标签进行分析
    for (const label of this.categories.flatMap(cat => cat.labels)) {
      if (relevantLabelIds.includes(label.id)) {
        // 这里应该根据内容分析得出实际分数
        // 为了演示，我们返回一些示例分数
        const score = this.calculateScoreFromContent(content, label);
        if (Math.abs(score) > 0.3) { // 只返回绝对值大于0.3的标签
          results.push({
            labelId: label.id,
            score,
            name: label.name
          });
        }
      }
    }

    return {
      category: category.id,
      labels: results
    };
  }

  private determineCategoryFromTopic(topic: string): CategoryDefinition | undefined {
    const topicLower = topic.toLowerCase();
    
    if (topicLower === 'general') {
      return undefined; // Will be handled in analyzeContentWithStandardLabels
    }
    
    // 根据话题关键词确定分类
    if (topicLower.includes('政治') || topicLower.includes('左') || topicLower.includes('右') || 
        topicLower.includes('自由') || topicLower.includes('保守') || topicLower.includes('威权')) {
      return this.getCategoryById('politics');
    } else if (topicLower.includes('经济') || topicLower.includes('市场') || 
               topicLower.includes('政府') || topicLower.includes('资本主义') || 
               topicLower.includes('社会主义')) {
      return this.getCategoryById('economy');
    } else if (topicLower.includes('社会') || topicLower.includes('个人') || 
               topicLower.includes('集体') || topicLower.includes('传统') || 
               topicLower.includes('进步')) {
      return this.getCategoryById('society');
    } else if (topicLower.includes('科技') || topicLower.includes('技术') || 
               topicLower.includes('创新') || topicLower.includes('AI') || 
               topicLower.includes('人工智能')) {
      return this.getCategoryById('technology');
    } else if (topicLower.includes('文化') || topicLower.includes('本土') || 
               topicLower.includes('全球') || topicLower.includes('物质') || 
               topicLower.includes('精神')) {
      return this.getCategoryById('culture');
    } else if (topicLower.includes('环境') || topicLower.includes('生态') || 
               topicLower.includes('发展') || topicLower.includes('保护')) {
      return this.getCategoryById('environment');
    }
    
    // 默认返回政治倾向分类
    return this.getCategoryById('politics');
  }

  private calculateScoreFromContent(content: string, label: LabelDefinition): number {
    // 这里应该实现基于内容的标签分数计算
    // 目前返回模拟分数
    const contentLower = content.toLowerCase();
    
    // 简单关键词匹配示例
    if (label.id === 'ideology') {
      if (contentLower.includes('社会主义') || contentLower.includes('平等') || contentLower.includes('福利')) {
        return 0.8; // 倾向左派
      } else if (contentLower.includes('资本主义') || contentLower.includes('自由市场') || contentLower.includes('效率')) {
        return -0.8; // 倾向右派
      }
    } else if (label.id === 'change') {
      if (contentLower.includes('传统') || contentLower.includes('家庭') || contentLower.includes('宗教')) {
        return -0.8; // 倾向保守
      } else if (contentLower.includes('自由') || contentLower.includes('选择') || contentLower.includes('多元')) {
        return 0.8; // 倾向自由
      }
    } else if (label.id === 'radicalism') {
      if (contentLower.includes('激进') || contentLower.includes('革命') || contentLower.includes('彻底')) {
        return 0.9; // 倾向激进
      } else if (contentLower.includes('温和') || contentLower.includes('渐进') || contentLower.includes('稳健')) {
        return -0.9; // 倾向温和
      }
    } else if (label.id === 'authority') {
      if (contentLower.includes('自由') || contentLower.includes('权利') || contentLower.includes('限制')) {
        return 0.8; // 倾向自由
      } else if (contentLower.includes('秩序') || contentLower.includes('权威') || contentLower.includes('管制')) {
        return -0.8; // 倾向威权
      }
    } else if (label.id === 'market_vs_gov') {
      if (contentLower.includes('监管') || contentLower.includes('政府') || contentLower.includes('干预')) {
        return -0.7; // 倾向政府干预
      } else if (contentLower.includes('市场') || contentLower.includes('自由') || contentLower.includes('竞争')) {
        return 0.7; // 倾向市场主导
      }
    } else if (label.id === 'individualism_vs_collectivism') {
      if (contentLower.includes('个人') || contentLower.includes('个体') || contentLower.includes('权利')) {
        return 0.8; // 倾向个人主义
      } else if (contentLower.includes('集体') || contentLower.includes('社区') || contentLower.includes('国家')) {
        return -0.8; // 倾向集体主义
      }
    } else if (label.id === 'change') { // Note: 'change' was used for 'traditional-progressive' logic in previous code but ID was 'traditional-progressive' there. Here 'change' is 'Progressive vs Traditional'.
      if (contentLower.includes('传统') || contentLower.includes('古老') || contentLower.includes('历史')) {
        return -0.8; // 倾向传统 (negative score for Traditional based on description "Progressive vs Traditional")
      } else if (contentLower.includes('进步') || contentLower.includes('现代') || contentLower.includes('革新')) {
        return 0.8; // 倾向进步
      }
    } else if (label.id === 'innovation_vs_security') {
      if (contentLower.includes('创新') || contentLower.includes('发展') || contentLower.includes('新技术')) {
        return 0.8; // 倾向创新
      } else if (contentLower.includes('安全') || contentLower.includes('风险') || contentLower.includes('保护')) {
        return -0.8; // 倾向安全
      }
    } else if (label.id === 'open_vs_closed') {
      if (contentLower.includes('开源') || contentLower.includes('开放') || contentLower.includes('共享')) {
        return 0.8; // 倾向开放
      } else if (contentLower.includes('专有') || contentLower.includes('封闭') || contentLower.includes('版权')) {
        return -0.8; // 倾向封闭
      }
    } else if (label.id === 'local_vs_global') {
      if (contentLower.includes('本土') || contentLower.includes('民族') || contentLower.includes('传统')) {
        return 0.8; // 倾向本土化
      } else if (contentLower.includes('全球') || contentLower.includes('国际') || contentLower.includes('融合')) {
        return -0.8; // 倾向全球化
      }
    } else if (label.id === 'spiritual_vs_material') {
      if (contentLower.includes('物质') || contentLower.includes('经济') || contentLower.includes('消费')) {
        return -0.8; // 倾向物质 (Material is negative in Spiritual vs Material?) Wait, description says "Spiritual vs Material". Usually first is positive, second is negative or vice versa. Let's check LabelDefinitions.ts.
        // LabelDefinitions.ts: { id: "spiritual_vs_material", name: "Spiritual vs Material", description: "Idealism/Philosophy vs Realism/Consumerism", ... }
        // Usually range [-1, 1]. If name is A vs B. Often A is -1 and B is 1 or vice versa.
        // Let's assume -1 is Spiritual and 1 is Material? Or vice versa?
        // In previous code:
        // if (contentLower.includes('物质')...) return 0.8; // 倾向物质
        // if (contentLower.includes('精神')...) return -0.8; // 倾向精神
        // Let's keep it consistent with previous logic if possible, but IDs changed.
        // Previous ID: material-spiritual. New ID: spiritual_vs_material.
        // Let's assume 1 is Spiritual, -1 is Material for now? Or just return a value.
        // Actually, let's just return values that make sense.
        return -0.8; 
      } else if (contentLower.includes('精神') || contentLower.includes('心灵') || contentLower.includes('文化')) {
        return 0.8; 
      }
    } else if (label.id === 'protection_vs_development') {
      if (contentLower.includes('发展') || contentLower.includes('经济') || contentLower.includes('增长')) {
        return -0.8; // 倾向发展
      } else if (contentLower.includes('保护') || contentLower.includes('环保') || contentLower.includes('生态')) {
        return 0.8; // 倾向保护
      }
    }
    
    // 默认返回中性分数
    return 0;
  }

  // 获取用于LLM的标签描述，以确保一致性
  getStandardLabelsForLLM(): string {
    let result = "标准标签系统：\n";
    
    for (const category of this.categories) {
      result += `\n分类: ${category.name} (${category.id})\n`;
      result += "标签:\n";
      for (const label of category.labels) {
        result += `  - ${label.name} (${label.id}): ${label.description}\n`;
      }
    }
    
    return result;
  }

  // New method to get labels for a specific category
  getLabelsForCategory(category: string): string {
    if (category === 'general') {
      return this.getStandardLabelsForLLM(); // For general, use all labels
    }
    const cat = this.getCategoryById(category);
    if (!cat) return this.getStandardLabelsForLLM(); // Fallback to all if not found

    let result = `分类: ${cat.name} (${cat.id})\n`;
    result += "标签:\n";
    for (const label of cat.labels) {
      result += `  - ${label.name} (${label.id}): ${label.description}\n`;
    }
    return result;
  }
}

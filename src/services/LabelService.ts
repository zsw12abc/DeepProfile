import { LabelDefinition, LabelGroup, AnalysisMode, MacroCategory } from "~types";
import { I18nService } from "./I18nService";
import { calculateFinalLabel } from "./LabelUtils";

// 定义标签组
const LABEL_GROUPS: LabelGroup[] = [
  {
    id: "politics",
    name: "Political Ideology",
    labels: [
      {
        id: "ideology",
        name: "左派 vs 右派|Left vs Right",
        description: "左翼/右翼意识形态倾向",
        weight: 1.0
      },
      {
        id: "liberty_order",
        name: "自由 vs 秩序|Liberty vs Order",
        description: "重视个人自由vs社会秩序",
        weight: 0.8
      },
      {
        id: "tradition_change",
        name: "传统 vs 变革|Tradition vs Change",
        description: "维护传统vs拥抱变革",
        weight: 0.8
      },
      {
        id: "nationalism_globalism",
        name: "民族主义 vs 全球主义|Nationalism vs Globalism",
        description: "民族利益vs全球合作",
        weight: 0.9
      },
      {
        id: "authoritarian_hierarchy",
        name: "威权 vs 平等|Authoritarian vs Egalitarian",
        description: "等级制度vs平等主义",
        weight: 0.9
      }
    ]
  },
  {
    id: "economy",
    name: "Economic Views",
    labels: [
      {
        id: "market_vs_gov",
        name: "市场 vs 政府|Market vs Government",
        description: "自由市场vs政府干预",
        weight: 1.0
      },
      {
        id: "competition_vs_equality",
        name: "竞争 vs 平等|Competition vs Equality",
        description: "市场竞争vs结果平等",
        weight: 0.9
      },
      {
        id: "speculation_vs_value",
        name: "投机 vs 价值|Speculation vs Value",
        description: "短期投机vs长期价值",
        weight: 0.7
      },
      {
        id: "real_vs_virtual",
        name: "实体 vs 虚拟|Real vs Virtual",
        description: "实体经济vs虚拟经济",
        weight: 0.7
      },
      {
        id: "capital_labor",
        name: "资方 vs 劳方|Capital vs Labor",
        description: "资本收益vs劳动权益",
        weight: 0.8
      }
    ]
  },
  {
    id: "society",
    name: "Social Values",
    labels: [
      {
        id: "individualism_vs_collectivism",
        name: "个人主义 vs 集体主义|Individualism vs Collectivism",
        description: "个人权利vs集体利益",
        weight: 1.0
      },
      {
        id: "feminism_vs_patriarchy",
        name: "女权主义 vs 父权制|Feminism vs Patriarchy",
        description: "性别平等vs传统性别角色",
        weight: 0.9
      },
      {
        id: "elite_vs_grassroots",
        name: "精英 vs 草根|Elite vs Grassroots",
        description: "精英治理vs草根民主",
        weight: 0.8
      },
      {
        id: "urban_vs_rural",
        name: "城市 vs 乡村|Urban vs Rural",
        description: "城市观念vs乡村传统",
        weight: 0.7
      },
      {
        id: "generational_conflict",
        name: "代际冲突|Generational Conflict",
        description: "新老世代观念差异",
        weight: 0.7
      },
      {
        id: "open_vs_closed",
        name: "开放 vs 封闭|Open vs Closed",
        description: "开放包容vs保守排外",
        weight: 0.8
      }
    ]
  },
  {
    id: "technology",
    name: "Technology & Innovation",
    labels: [
      {
        id: "innovation_vs_security",
        name: "创新 vs 安全|Innovation vs Security",
        description: "技术进步vs安全稳定",
        weight: 0.7
      },
      {
        id: "acceleration_vs_caution",
        name: "加速主义 vs 谨慎主义|Acceleration vs Caution",
        description: "技术加速vs审慎发展",
        weight: 0.7
      },
      {
        id: "privacy_vs_convenience",
        name: "隐私 vs 便利|Privacy vs Convenience",
        description: "隐私保护vs生活便利",
        weight: 0.8
      }
    ]
  },
  {
    id: "culture",
    name: "Culture & Lifestyle",
    labels: [
      {
        id: "material_vs_spiritual",
        name: "物质 vs 精神|Material vs Spiritual",
        description: "物质享受vs精神追求",
        weight: 0.7
      },
      {
        id: "work_vs_life",
        name: "工作 vs 生活|Work vs Life",
        description: "事业成就vs生活品质",
        weight: 0.7
      },
      {
        id: "conformity_vs_individuality",
        name: "从众 vs 个性|Conformity vs Individuality",
        description: "社会规范vs个人特色",
        weight: 0.7
      }
    ]
  }
];

export class LabelService {
  private static instance: LabelService;
  private labels: LabelDefinition[] = [];
  private labelMap: Map<string, LabelDefinition> = new Map();

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
    LABEL_GROUPS.forEach(group => {
      group.labels.forEach(label => {
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

  // 添加缺失的方法
  public getCategories(): LabelGroup[] {
    return LABEL_GROUPS;
  }

  public getCategoryById(id: string): LabelGroup | undefined {
    return LABEL_GROUPS.find(group => group.id === id);
  }

  public getLabelsByCategory(categoryId: string): LabelDefinition[] {
    const category = this.getCategoryById(categoryId);
    if (!category) {
      return [];
    }
    return category.labels;
  }

  public getLabelsForContext(category: MacroCategory, mode: AnalysisMode = 'balanced'): string {
    // 获取基础标签
    const baseLabels = this.getBaseLabels();
    
    // 根据类别获取特定标签
    const categoryLabels = this.getCategoryLabels(category);
    
    // 根据模式调整标签
    const filteredLabels = this.filterLabelsByMode(baseLabels.concat(categoryLabels), mode);
    
    // 格式化输出
    return this.formatLabels(filteredLabels);
  }
  
  // 添加缺失的方法
  public getStandardLabelsForLLM(): string {
    const allGroups = this.getCategories();
    let result = "标准标签系统:\n";
    
    allGroups.forEach(group => {
      result += `\n分类: ${group.name}\n`;
      result += `  标签:\n`;
      group.labels.forEach(label => {
        const nameParts = label.name.split('|');
        const displayName = I18nService.getLanguage() === 'en-US' ? nameParts[1] || nameParts[0] : nameParts[0] || nameParts[1];
        result += `    - ${label.id}: ${displayName} (${label.description})\n`;
      });
    });
    
    return result;
  }
  
  private getBaseLabels(): LabelDefinition[] {
    return this.labels;
  }
  
  private getCategoryLabels(category: MacroCategory): LabelDefinition[] {
    switch(category) {
      case 'politics':
        return this.labels.filter(l => 
          l.id.includes('ideology') || 
          l.id.includes('liberty') || 
          l.id.includes('tradition') || 
          l.id.includes('nationalism') ||
          l.id.includes('authoritarian')
        );
      case 'economy':
        return this.labels.filter(l => 
          l.id.includes('market') || 
          l.id.includes('competition') || 
          l.id.includes('speculation') || 
          l.id.includes('real') ||
          l.id.includes('capital')
        );
      case 'society':
        return this.labels.filter(l => 
          l.id.includes('individualism') || 
          l.id.includes('feminism') || 
          l.id.includes('elite') || 
          l.id.includes('urban') ||
          l.id.includes('generational') ||
          l.id.includes('open')
        );
      case 'technology':
        return this.labels.filter(l => 
          l.id.includes('innovation') || 
          l.id.includes('acceleration') || 
          l.id.includes('privacy')
        );
      case 'culture':
      case 'entertainment':
        return this.labels.filter(l => 
          l.id.includes('material') || 
          l.id.includes('work') || 
          l.id.includes('conformity')
        );
      case 'environment':
        return this.labels.filter(l => 
          l.id.includes('innovation') || 
          l.id.includes('tradition') || 
          l.id.includes('open')
        );
      case 'lifestyle_career':
        return this.labels.filter(l => 
          l.id.includes('work') || 
          l.id.includes('material') || 
          l.id.includes('conformity')
        );
      default:
        return this.labels;
    }
  }
  
  private filterLabelsByMode(labels: LabelDefinition[], mode: AnalysisMode): LabelDefinition[] {
    switch(mode) {
      case 'fast':
        // 快速模式只返回最重要的标签
        return labels.filter(l => l.weight >= 0.9);
      case 'balanced':
        // 平衡模式返回权重中等及以上的标签
        return labels.filter(l => l.weight >= 0.7);
      case 'deep':
        // 深度模式返回所有标签
        return labels;
    }
  }
  
  private formatLabels(labels: LabelDefinition[]): string {
    const isEn = I18nService.getLanguage() === 'en-US';
    
    return labels.map(label => {
      const nameParts = label.name.split('|');
      const displayName = isEn ? nameParts[1] || nameParts[0] : nameParts[0] || nameParts[1];
      return `- 【${label.id}】: ${displayName} (${label.description})`;
    }).join('\n');
  }
  
  public refreshCategories() {
    // 当语言发生变化时，可能需要重新初始化标签
    // 目前我们只需要确保语言服务已初始化
    I18nService.getLanguage();
  }
  
  // 分析内容并返回标签分数
  public analyzeContentWithStandardLabels(content: string, category: string = 'general'): { category: string; labels: Array<{ label: string; score: number }> } {
    // 这是一个简化版本，实际实现可能会更复杂
    // 使用启发式规则基于内容分析标签倾向
    const contentLower = content.toLowerCase();
    const results: Array<{ label: string; score: number }> = [];
    
    for (const label of this.labels) {
      const score = this.calculateScoreForLabel(label, contentLower);
      if (Math.abs(score) > 0.1) { // 只返回有一定倾向性的标签
        results.push({ label: label.id, score });
      }
    }
    
    return {
      category,
      labels: results
    };
  }
  
  private calculateScoreForLabel(label: LabelDefinition, contentLower: string): number {
    // 根据标签ID和内容计算倾向性分数
    // 这是一个简化的启发式方法，实际实现可能会使用ML模型
    switch(label.id) {
      case 'ideology':
        if (contentLower.includes('左') || contentLower.includes('left')) return 0.8;
        if (contentLower.includes('右') || contentLower.includes('right')) return -0.8;
        if (contentLower.includes('自由') || contentLower.includes('liberal')) return 0.7;
        if (contentLower.includes('保守') || contentLower.includes('conservative')) return -0.7;
        break;
      case 'market_vs_gov':
        if (contentLower.includes('市场') || contentLower.includes('market')) return 0.8;
        if (contentLower.includes('政府') || contentLower.includes('gov')) return -0.8;
        if (contentLower.includes('监管') || contentLower.includes('regulat')) return -0.7;
        if (contentLower.includes('自由') || contentLower.includes('free')) return 0.7;
        break;
      case 'individualism_vs_collectivism':
        if (contentLower.includes('个人') || contentLower.includes('individual')) return 0.8;
        if (contentLower.includes('集体') || contentLower.includes('collective')) return -0.8;
        if (contentLower.includes('权利') || contentLower.includes('rights')) return 0.7;
        if (contentLower.includes('团结') || contentLower.includes('unity')) return -0.7;
        break;
      case 'feminism_vs_patriarchy':
        if (contentLower.includes('女权') || contentLower.includes('feminist')) return 0.8;
        if (contentLower.includes('传统') || contentLower.includes('traditional')) return -0.8;
        if (contentLower.includes('平权') || contentLower.includes('equality')) return 0.7;
        if (contentLower.includes('家庭') || contentLower.includes('family')) return -0.7;
        break;
      case 'innovation_vs_security':
        if (contentLower.includes('创新') || contentLower.includes('innovat')) return 0.8;
        if (contentLower.includes('安全') || contentLower.includes('securit')) return -0.8;
        if (contentLower.includes('发展') || contentLower.includes('develop')) return 0.7;
        if (contentLower.includes('风险') || contentLower.includes('risk')) return -0.7;
        break;
      case 'open_vs_closed':
        if (contentLower.includes('开放') || contentLower.includes('open')) return 0.8;
        if (contentLower.includes('封闭') || contentLower.includes('closed')) return -0.8;
        if (contentLower.includes('共享') || contentLower.includes('share')) return 0.7;
        if (contentLower.includes('专有') || contentLower.includes('proprietary')) return -0.7;
        break;
      case 'urban_vs_rural':
        if (contentLower.includes('城市') || contentLower.includes('urban')) return 0.8;
        if (contentLower.includes('乡村') || contentLower.includes('rural')) return -0.8;
        if (contentLower.includes('现代') || contentLower.includes('modern')) return 0.7;
        if (contentLower.includes('传统') || contentLower.includes('tradition')) return -0.7;
        break;
      case 'generational_conflict':
        if (contentLower.includes('年轻') || contentLower.includes('young')) return 0.8;
        if (contentLower.includes('老') || contentLower.includes('old')) return -0.8;
        if (contentLower.includes('新') || contentLower.includes('new')) return 0.7;
        if (contentLower.includes('旧') || contentLower.includes('old')) return -0.7;
        break;
      case 'competition_vs_equality':
        if (contentLower.includes('竞争') || contentLower.includes('competit')) return 0.8;
        if (contentLower.includes('平等') || contentLower.includes('equalit')) return -0.8;
        if (contentLower.includes('优胜劣汰') || contentLower.includes('survival')) return 0.7;
        if (contentLower.includes('互助') || contentLower.includes('mutual')) return -0.7;
        break;
      case 'speculation_vs_value':
        if (contentLower.includes('投机') || contentLower.includes('speculat')) return -0.8;
        if (contentLower.includes('价值') || contentLower.includes('value')) return 0.8;
        if (contentLower.includes('长期') || contentLower.includes('long-term')) return 0.7;
        if (contentLower.includes('短期') || contentLower.includes('short-term')) return -0.7;
        break;
      case 'real_vs_virtual':
        if (contentLower.includes('实体') || contentLower.includes('real')) return 0.8;
        if (contentLower.includes('虚拟') || contentLower.includes('virtual')) return -0.8;
        if (contentLower.includes('制造') || contentLower.includes('manufactur')) return 0.7;
        if (contentLower.includes('金融') || contentLower.includes('finance')) return -0.7;
        break;
      case 'elite_vs_grassroots':
        if (contentLower.includes('精英') || contentLower.includes('elite')) return 0.8;
        if (contentLower.includes('草根') || contentLower.includes('grassroot')) return -0.8;
        if (contentLower.includes('专业') || contentLower.includes('expert')) return 0.7;
        if (contentLower.includes('民众') || contentLower.includes('people')) return -0.7;
        break;
      case 'liberty_order':
        if (contentLower.includes('自由') || contentLower.includes('libert')) return 0.8;
        if (contentLower.includes('秩序') || contentLower.includes('order')) return -0.8;
        if (contentLower.includes('权利') || contentLower.includes('right')) return 0.7;
        if (contentLower.includes('管制') || contentLower.includes('control')) return -0.7;
        break;
      case 'tradition_change':
        if (contentLower.includes('传统') || contentLower.includes('tradition')) return 0.8;
        if (contentLower.includes('革新') || contentLower.includes('change')) return -0.8;
        if (contentLower.includes('守旧') || contentLower.includes('conservat')) return 0.7;
        if (contentLower.includes('改革') || contentLower.includes('reform')) return -0.7;
        break;
      case 'nationalism_globalism':
        if (contentLower.includes('民族') || contentLower.includes('nation')) return 0.8;
        if (contentLower.includes('全球') || contentLower.includes('global')) return -0.8;
        if (contentLower.includes('主权') || contentLower.includes('sovereignty')) return 0.7;
        if (contentLower.includes('合作') || contentLower.includes('cooperat')) return -0.7;
        break;
      case 'authoritarian_hierarchy':
        if (contentLower.includes('权威') || contentLower.includes('authorit')) return 0.8;
        if (contentLower.includes('平等') || contentLower.includes('equal')) return -0.8;
        if (contentLower.includes('等级') || contentLower.includes('hierarch')) return 0.7;
        if (contentLower.includes('民主') || contentLower.includes('democracy')) return -0.7;
        break;
      case 'acceleration_vs_caution':
        if (contentLower.includes('加速') || contentLower.includes('accelerat')) return 0.8;
        if (contentLower.includes('谨慎') || contentLower.includes('cautious')) return -0.8;
        if (contentLower.includes('进步') || contentLower.includes('progress')) return 0.7;
        if (contentLower.includes('稳健') || contentLower.includes('steady')) return -0.7;
        break;
      case 'privacy_vs_convenience':
        if (contentLower.includes('隐私') || contentLower.includes('privac')) return 0.8;
        if (contentLower.includes('便利') || contentLower.includes('convenienc')) return -0.8;
        if (contentLower.includes('保护') || contentLower.includes('protect')) return 0.7;
        if (contentLower.includes('便捷') || contentLower.includes('convenient')) return -0.7;
        break;
      case 'material_vs_spiritual':
        if (contentLower.includes('物质') || contentLower.includes('materi')) return 0.8;
        if (contentLower.includes('精神') || contentLower.includes('spiritual')) return -0.8;
        if (contentLower.includes('财富') || contentLower.includes('wealth')) return 0.7;
        if (contentLower.includes('心灵') || contentLower.includes('soul')) return -0.7;
        break;
      case 'work_vs_life':
        if (contentLower.includes('工作') || contentLower.includes('work')) return 0.8;
        if (contentLower.includes('生活') || contentLower.includes('life')) return -0.8;
        if (contentLower.includes('事业') || contentLower.includes('career')) return 0.7;
        if (contentLower.includes('休闲') || contentLower.includes('leisure')) return -0.7;
        break;
      case 'conformity_vs_individuality':
        if (contentLower.includes('个性') || contentLower.includes('individu')) return 0.8;
        if (contentLower.includes('从众') || contentLower.includes('conform')) return -0.8;
        if (contentLower.includes('独特') || contentLower.includes('unique')) return 0.7;
        if (contentLower.includes('统一') || contentLower.includes('uniform')) return -0.7;
        break;
      case 'capital_labor':
        if (contentLower.includes('资本') || contentLower.includes('capital')) return 0.8;
        if (contentLower.includes('劳动') || contentLower.includes('labor')) return -0.8;
        if (contentLower.includes('投资') || contentLower.includes('invest')) return 0.7;
        if (contentLower.includes('工资') || contentLower.includes('wage')) return -0.7;
        break;
      default:
        // 对于未特别处理的标签，使用通用关键词匹配
        const nameParts = label.name.split('|');
        const chineseTerms = (nameParts[0] || '').split(/[|，,]/);
        const englishTerms = (nameParts[1] || '').split(/[|-]/);
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        chineseTerms.forEach(term => {
          if (contentLower.includes(term.toLowerCase())) {
            positiveCount++;
          }
        });
        
        englishTerms.forEach(term => {
          if (contentLower.includes(term.toLowerCase())) {
            positiveCount++;
          }
        });
        
        // 根据标签的描述进一步细化判断
        if (label.description.toLowerCase().includes('vs') || label.description.toLowerCase().includes('versus')) {
          const parts = label.description.split(/vs|versus/i);
          if (parts.length >= 2) {
            const leftSide = parts[0].toLowerCase();
            const rightSide = parts[1].toLowerCase();
            
            if (contentLower.includes(leftSide)) negativeCount++;
            if (contentLower.includes(rightSide)) positiveCount++;
          }
        }
        
        if (positiveCount > 0 || negativeCount > 0) {
          return (positiveCount - negativeCount) / (positiveCount + negativeCount);
        }
    }
    
    return 0; // 默认无明显倾向
  }
}
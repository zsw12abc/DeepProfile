import { LABEL_CATEGORIES } from "./LabelDefinitions";

// 后备映射：确保即使无法加载LabelDefinitions，也能将ID转换为中文名称
// 格式必须为 "左侧选项 vs 右侧选项"，与LabelDefinitions保持一致
const FALLBACK_ID_NAMES: Record<string, string> = {
  "left-right": "左派 vs 右派",
  "liberal-conservative": "保守派 vs 自由派",
  "radical-moderate": "温和派 vs 激进派",
  "libertarian-authoritarian": "自由意志 vs 威权主义",
  "capitalist-socialist": "社会主义 vs 资本主义",
  "nationalist-globalist": "民族主义 vs 全球主义",
  "market-intervention": "政府干预 vs 市场主导",
  "wealth-distribution": "平等分配 vs 自由竞争",
  "individual-collective": "集体主义 vs 个人主义",
  "traditional-progressive": "传统派 vs 进步派",
  "innovation-security": "安全导向 vs 创新导向",
  "open-proprietary": "封闭 vs 开放",
  "local-global": "本土化 vs 全球化",
  "material-spiritual": "精神 vs 物质",
  "development-protection": "保护 vs 发展"
};

// 将标签名称解析为左右选项
export function parseLabelName(labelName: string): { left: string, right: string } {
  if (labelName.includes(' vs ') || labelName.includes(' 与 ') || labelName.includes(' 和 ')) {
    const separator = labelName.includes(' vs ') ? ' vs ' : 
                     labelName.includes(' 与 ') ? ' 与 ' : ' 和 ';
    const parts = labelName.split(separator);
    if (parts.length === 2) {
      return { left: parts[0].trim(), right: parts[1].trim() };
    }
  }
  
  // Fallback: 如果是ID格式 (e.g. "left-right")，尝试按连字符分割
  // 这处理了 getLabelInfo 失败或者直接传入 ID 的情况
  if (labelName.includes('-') && !labelName.includes(' ')) {
     const parts = labelName.split('-');
     if (parts.length === 2) {
         return { left: parts[0].trim(), right: parts[1].trim() };
     }
  }
  
  // 如果没有找到分隔符，返回原标签名称作为右边选项，左边为空
  return { left: "", right: labelName.trim() };
}

// 根据分数和标签名称计算最终显示的标签和百分比
export function calculateFinalLabel(labelName: string, score: number): { label: string, percentage: number } {
  // 1. 尝试查找标签定义，如果输入的是ID，则获取其显示名称
  let nameToParse = labelName;
  const labelInfo = getLabelInfo(labelName);
  
  if (labelInfo) {
    nameToParse = labelInfo.name;
  } else if (FALLBACK_ID_NAMES[labelName]) {
    // 2. 如果找不到定义但有后备映射，使用后备映射
    nameToParse = FALLBACK_ID_NAMES[labelName];
  }

  const parsed = parseLabelName(nameToParse);
  
  // 确保分数在-1到1的范围内
  const normalizedScore = Math.max(-1, Math.min(1, score));
  
  // 计算百分比（取分数绝对值并转换为百分比）
  const percentage = Math.abs(normalizedScore) * 100;
  
  // 根据分数正负选择标签
  // 正分 -> 右侧选项
  // 负分 -> 左侧选项
  const selectedLabel = normalizedScore >= 0 ? parsed.right : parsed.left;
  
  return {
    label: selectedLabel,
    percentage: Math.round(percentage)
  };
}

// 获取标签的详细信息
export function getLabelInfo(labelId: string) {
  for (const category of LABEL_CATEGORIES) {
    const label = category.labels.find(l => l.id === labelId);
    if (label) {
      return {
        ...label,
        categoryName: category.name
      };
    }
  }
  return null;
}

// 根据话题分类获取相关标签
export function getRelevantLabelsByTopic(topic: string) {
  const topicLower = topic.toLowerCase();
  
  // 根据话题关键词确定相关分类
  const relevantCategories: string[] = [];
  
  if (topicLower.includes('政治') || topicLower.includes('左') || topicLower.includes('右') || 
      topicLower.includes('自由') || topicLower.includes('保守') || topicLower.includes('威权') ||
      topicLower.includes('社会主义') || topicLower.includes('资本主义') || 
      topicLower.includes('民族') || topicLower.includes('全球')) {
    relevantCategories.push('political-orientation', 'economic-view', 'social-view');
  } else if (topicLower.includes('经济') || topicLower.includes('市场') || 
             topicLower.includes('政府') || topicLower.includes('资本主义') || 
             topicLower.includes('社会主义') || topicLower.includes('财富') || 
             topicLower.includes('分配')) {
    relevantCategories.push('economic-view', 'political-orientation');
  } else if (topicLower.includes('社会') || topicLower.includes('个人') || 
             topicLower.includes('集体') || topicLower.includes('传统') || 
             topicLower.includes('进步') || topicLower.includes('文化')) {
    relevantCategories.push('social-view', 'cultural-view', 'political-orientation');
  } else if (topicLower.includes('科技') || topicLower.includes('技术') || 
             topicLower.includes('创新') || topicLower.includes('AI') || 
             topicLower.includes('人工智能')) {
    relevantCategories.push('technology-view');
  } else if (topicLower.includes('文化') || topicLower.includes('本土') || 
             topicLower.includes('全球') || topicLower.includes('物质') || 
             topicLower.includes('精神')) {
    relevantCategories.push('cultural-view', 'social-view');
  } else if (topicLower.includes('环境') || topicLower.includes('生态') || 
             topicLower.includes('发展') || topicLower.includes('保护')) {
    relevantCategories.push('environment-view');
  } else {
    // 默认返回政治和社会相关的分类
    relevantCategories.push('political-orientation', 'social-view', 'economic-view');
  }
  
  // 获取相关分类的所有标签
  const relevantLabels: { id: string, name: string, description: string, category: string }[] = [];
  
  for (const categoryId of relevantCategories) {
    const category = LABEL_CATEGORIES.find(cat => cat.id === categoryId);
    if (category) {
      for (const label of category.labels) {
        relevantLabels.push({
          id: label.id,
          name: label.name,
          description: label.description,
          category: category.name
        });
      }
    }
  }
  
  return relevantLabels;
}
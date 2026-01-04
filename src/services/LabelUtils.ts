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
  // 首先检查是否是标签ID，如果是，转换为标准名称
  if (FALLBACK_ID_NAMES[labelName]) {
    labelName = FALLBACK_ID_NAMES[labelName];
  } else {
    // 尝试从标签定义中获取标准名称
    const labelInfo = getLabelInfo(labelName);
    if (labelInfo) {
      labelName = labelInfo.name;
    }
  }
  
  // 检查是否是标准格式 "左侧选项 vs 右侧选项"
  if (labelName.includes(' vs ')) {
    const parts = labelName.split(' vs ');
    if (parts.length === 2) {
      return { left: parts[0].trim(), right: parts[1].trim() };
    }
  }
  
  // 如果没有找到标准分隔符，返回原标签名称作为右边选项，左边为空
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
          name: label.name, // 确保使用标准名称
          description: label.description,
          category: category.name
        });
      }
    }
  }
  
  return relevantLabels;
}

// 根据话题分类过滤标签，确保只返回相关标签
export function filterLabelsByTopic(labels: Array<{ label: string; score: number }>, topic: string): Array<{ label: string; score: number }> {
  // 如果没有标签，直接返回空数组
  if (!labels || labels.length === 0) return [];
  
  // 获取相关标签的ID列表
  const relevantLabels = getRelevantLabelsByTopic(topic).map(l => l.id);
  
  // 过滤标签
  const filtered = labels.filter(item => {
    // 1. 尝试通过标签ID匹配
    // 检查item.label是否直接是ID
    if (relevantLabels.includes(item.label)) {
      return true;
    }
    
    // 2. 尝试通过标签名称反向查找ID
    const labelInfo = getLabelInfo(item.label);
    if (labelInfo && relevantLabels.includes(labelInfo.id)) {
      return true;
    }
    
    // 3. 如果是中文名称，尝试匹配
    // 遍历所有相关标签，看是否包含该中文名称
    // 或者该中文名称是否包含相关标签的关键词
    return relevantLabels.some(rlId => {
      const rlInfo = getLabelInfo(rlId);
      if (!rlInfo) return false;
      
      // 检查名称是否包含
      if (item.label.includes(rlInfo.name) || rlInfo.name.includes(item.label)) {
        return true;
      }
      
      // 检查ID是否包含
      if (item.label.includes(rlId)) {
        return true;
      }
      
      return false;
    });
  });
  
  // 如果过滤后没有标签，为了避免显示空白，返回原始标签的前3个（假设它们是最重要的）
  // 或者根据话题返回默认标签
  if (filtered.length === 0 && labels.length > 0) {
    // 如果话题是娱乐类的，确实不应该显示政治标签
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('娱乐') || topicLower.includes('游戏') || topicLower.includes('动漫') || 
        topicLower.includes('电影') || topicLower.includes('音乐') || topicLower.includes('体育')) {
      return [];
    }
    
    // 对于其他话题，如果过滤结果为空，可能是匹配逻辑太严格，返回原始标签
    return labels;
  }
  
  return filtered;
}

// 使用模糊匹配处理未明确分类的话题
export function getMostRelevantLabelsByTopic(topic: string): string[] {
  const topicLower = topic.toLowerCase();
  const allCategories = LABEL_CATEGORIES;
  const matchedCategories: string[] = [];

  // 关键词匹配，使用更广泛的匹配策略
  for (const category of allCategories) {
    let categoryScore = 0;
    
    // 检查话题是否包含该分类下任一标签的关键词
    for (const label of category.labels) {
      // 检查标签ID是否与话题相关
      if (topicLower.includes(label.id.replace(/-/g, ' ').split(' ').some(word => topicLower.includes(word)))) {
        categoryScore++;
      }
      
      // 检查标签名称是否与话题相关
      const labelNameLower = label.name.toLowerCase();
      if (topicLower.split(/\s+/).some(word => labelNameLower.includes(word) || word.length > 2 && labelNameLower.includes(word))) {
        categoryScore++;
      }
      
      // 检查标签描述是否与话题相关
      const descriptionLower = label.description.toLowerCase();
      if (topicLower.split(/\s+/).some(word => descriptionLower.includes(word) || word.length > 2 && descriptionLower.includes(word))) {
        categoryScore++;
      }
    }
    
    // 如果该分类得分大于0，添加到相关分类列表
    if (categoryScore > 0) {
      matchedCategories.push(category.id);
    }
  }

  // 如果没有明确匹配的分类，使用默认分类
  if (matchedCategories.length === 0) {
    // 根据话题内容使用更智能的默认分类
    if (topicLower.includes('科技') || topicLower.includes('技术') || topicLower.includes('创新') || 
        topicLower.includes('ai') || topicLower.includes('软件') || topicLower.includes('硬件') ||
        topicLower.includes('数码') || topicLower.includes('编程') || topicLower.includes('算法')) {
      matchedCategories.push('technology-view');
    } else if (topicLower.includes('娱乐') || topicLower.includes('游戏') || topicLower.includes('动漫') || 
               topicLower.includes('电影') || topicLower.includes('音乐') || topicLower.includes('体育') ||
               topicLower.includes('明星') || topicLower.includes('综艺')) {
      // 对于娱乐类话题，不返回政治相关标签，只返回通用性格特征
      return []; // 娱乐话题可能不需要政治倾向标签
    } else if (topicLower.includes('财经') || topicLower.includes('投资') || topicLower.includes('股票') ||
               topicLower.includes('金融') || topicLower.includes('商业') || topicLower.includes('创业')) {
      matchedCategories.push('economic-view');
    } else {
      // 默认返回政治和社会相关的分类
      matchedCategories.push('political-orientation', 'social-view');
    }
  }

  // 返回匹配分类的所有标签ID
  const relevantLabelIds: string[] = [];
  for (const categoryId of matchedCategories) {
    const category = allCategories.find(cat => cat.id === categoryId);
    if (category) {
      category.labels.forEach(label => {
        relevantLabelIds.push(label.id);
      });
    }
  }

  return [...new Set(relevantLabelIds)]; // 去重
}
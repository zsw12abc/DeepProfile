// Mock for TopicService
export const TopicService = {
  getCategoryName: (category: string) => {
    const categoryMap: Record<string, string> = {
      'tech': '技术',
      'science': '科学',
      'culture': '文化',
      'politics': '政治',
      'economics': '经济',
      'entertainment': '娱乐',
      'sports': '体育',
      'health': '健康',
      'education': '教育',
      'travel': '旅行',
      'food': '美食',
      'fashion': '时尚',
      'business': '商业',
      'art': '艺术',
      'philosophy': '哲学',
      'psychology': '心理学',
      'environment': '环境',
      'history': '历史',
      'religion': '宗教',
      'literature': '文学',
      'music': '音乐',
      'film': '电影',
      'games': '游戏',
      'automotive': '汽车',
      'real_estate': '房地产',
      'parenting': '育儿',
      'relationships': '人际关系',
      'career': '职业',
      'finance': '金融',
      'fitness': '健身',
      'technology': '科技',
      'news': '新闻',
      'other': '其他',
    };
    
    return categoryMap[category] || category;
  },
};

export type MacroCategory = string;
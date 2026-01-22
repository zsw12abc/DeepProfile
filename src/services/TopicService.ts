import { LLMService } from "./LLMService";
import type { MacroCategory } from "~types";
import { I18nService } from "./I18nService";

const CATEGORIES: MacroCategory[] = [
  'politics', 'economy', 'society', 'technology', 
  'culture', 'environment', 'entertainment', 'lifestyle_career'
];

export class TopicService {
  
  static classify(context: any): MacroCategory {
    if (!context) return 'general';
    
    // Ensure text is a string and convert to lowercase
    let text = "";
    try {
      text = String(context).toLowerCase();
    } catch (e) {
      return 'general';
    }
    
    // 1. 娱乐 (Entertainment) - 高优先级，避免与文化混淆
    if (this.matches(text, [
      '娱乐', '游戏', '二次元', '动漫', 'acgn', '明星', '体育', '足球', '篮球', '电影',
      '音乐', '亚文化', '小众', '邪典', 'entertainment', 'game', 'movie', 'music', 'sport', 'anime',
      '原神', '王者荣耀', '英雄联盟', 'lol', 'dota', 'steam', 'switch', 'ps5', 'xbox', '任天堂',
      'nba', 'cba', '世界杯', '奥运会', '梅西', 'c罗', '詹姆斯', '科比', '演唱会', '综艺'
    ])) {
      return 'entertainment';
    }

    // 2. 政治 (Politics)
    if (this.matches(text, [
      '政治', '意识形态', '左翼', '右翼', '自由主义', '威权', '政府', '国家', '外交', '战争', 
      '军事', '地缘', '民族', '爱国', '改革', '保守', '建制', '民粹', 'politics', 'ideology', 'government', 'war',
      '美国', '中国', '俄罗斯', '乌克兰', '以色列', '巴勒斯坦', '台湾', '日本', '韩国', '朝鲜', '印度', '欧洲', '欧盟',
      '拜登', '特朗普', '普京', '泽连斯基', '联合国', '北约', '制裁', '贸易战', '脱钩', '一带一路',
      '巡洋舰', '航母', '战斗机', '导弹', '核武器', '军队', '解放军', '美军'
    ])) {
      return 'politics';
    }

    // 3. 经济 (Economy)
    if (this.matches(text, [
      '经济', '金融', '市场', '计划', '公有制', '私有制', '国企', '民企', '投资', '股票', 
      '基金', '币圈', '宏观', '汇率', '搞钱', '副业', '实体经济', '虚拟经济', 'economy', 'finance', 'market', 'money',
      'gdp', 'cpi', '通胀', '通缩', '降息', '加息', '美联储', '央行', '财政', '税收', '债务', '房地产', '房价',
      '股市', 'a股', '美股', '港股', '比特币', '以太坊', '区块链', 'web3', '消费', '降级', '升级'
    ])) {
      return 'economy';
    }

    // 4. 社会 (Society)
    if (this.matches(text, [
      '社会', '集体', '个人', '阶级', '资本', '躺平', '内卷', '奋斗', '女权', '性别', 
      '家庭观', '父权', '城市', '乡土', '地域', '代际', '后浪', '00后', 'society', 'class', 'gender', 'feminism',
      '人口', '生育', '老龄化', '少子化', '退休', '养老', '医保', '社保', '教育', '高考', '考研', '留学',
      '歧视', '公平', '正义', '道德', '伦理', '法律', '案件', '犯罪', '治安'
    ])) {
      return 'society';
    }

    // 5. 科技 (Technology)
    if (this.matches(text, [
      '科技', '技术', '开源', '闭源', 'ai', '人工智能', '加速主义', '安卓', '苹果', 'windows',
      '数码', '评测', '芯片', '软件', '硬件', '去中心化', 'technology', 'tech', 'ai', 'code', 'software',
      'chatgpt', 'gpt', 'llm', '大模型', '华为', '小米', '荣耀', 'oppo', 'vivo', '三星', '索尼',
      '显卡', 'cpu', 'gpu', '英伟达', '英特尔', 'amd', '特斯拉', '马斯克', 'spacex', '火箭', '航天'
    ])) {
      return 'technology';
    }

    // 6. 文化 (Culture) - 低优先级，包含更抽象的概念
    if (this.matches(text, [
      '文化', '传统', '国学', '西化', '普世价值', '审美', '哲学', '艺术', '宗教', '信仰',
      '无神论', '玄学', '神秘学', '星座', 'culture', 'tradition', 'art', 'philosophy', 'religion',
      '历史', '文学', '小说', '诗歌', '绘画', '书法', '音乐', '戏剧', '博物馆', '文物'
    ])) {
      return 'culture';
    }

    // 7. 环境 (Environment)
    if (this.matches(text, [
      '环境', '环保', '气候', '变暖', '碳排放', '污染', '生态', '绿色', 'environment', 'climate', 'pollution', 'green',
      '新能源', '电动车', '电池', '光伏', '风能', '核能', '垃圾分类', '保护动物', '生物多样性'
    ])) {
      return 'environment';
    }

    // 8. 生活与职场 (Lifestyle & Career)
    if (this.matches(text, [
      '生活', '消费', '极细', '奢华', '精致', '健康', '养生', '熬夜', '婚恋', '单身',
      '丁克', '二胎', '宠物', '猫', '狗', '职场', '工作', '体制内', '考公', '编制', 
      '自由职业', '打工', '摸鱼', '老板', '创业', 'lifestyle', 'life', 'health', 'marriage', 'pet', 'career', 'job', 'work',
      '面试', '简历', '跳槽', '裁员', '失业', '996', '007', '加班', '调休', '年假', '工资', '薪资',
      '买房', '租房', '装修', '家居', '美食', '做饭', '外卖', '旅游', '旅行', '签证'
    ])) {
      return 'lifestyle_career';
    }

    // 默认归类
    return 'general';
  }

  private static matches(text: string, keywords: string[]): boolean {
    // 确保参数有效
    if (!text || typeof text !== 'string' || !keywords || !Array.isArray(keywords)) {
      return false;
    }
    
    // 确保text是字符串
    const searchText = String(text);
    
    // 检查每个关键字是否存在于文本中
    for (const kw of keywords) {
      if (typeof kw === 'string' && searchText.includes(kw)) {
        return true;
      }
    }
    
    return false;
  }

  static getCategoryName(category: MacroCategory): string {
    switch (category) {
      case 'politics': return I18nService.t('category_politics');
      case 'economy': return I18nService.t('category_economy');
      case 'society': return I18nService.t('category_society');
      case 'technology': return I18nService.t('category_technology');
      case 'culture': return I18nService.t('category_culture');
      case 'environment': return I18nService.t('category_environment');
      case 'entertainment': return I18nService.t('category_entertainment');
      case 'lifestyle_career': return I18nService.t('category_lifestyle_career');
      case 'general': return I18nService.t('category_general');
      default: return category;
    }
  }

  static async classifyWithLLM(context: string): Promise<MacroCategory> {
    const prompt = `
      你是一个文本分类专家。请将以下文本归类到这几个分类中最合适的一个：
      ${CATEGORIES.join(', ')}

      文本: "${context}"

      请只返回最合适的分类ID，不要添加任何解释或标点符号。
    `;
    
    try {
      const result = await LLMService.generateRawText(prompt);

      if (CATEGORIES.includes(result as MacroCategory)) {
        return result as MacroCategory;
      }
    } catch (e) {
      console.error("LLM classification failed:", e);
    }

    // Fallback to general if LLM fails or returns invalid data
    return 'general';
  }
}
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

// 定义所有标签分类
// 注意：name字段的格式应为 "左侧选项 vs 右侧选项"
// 评分规则：负分倾向于左侧选项，正分倾向于右侧选项
// 必须与 LLM Prompt 中的说明保持一致：
// * 正值表示偏向标签名称右边的选项（如：右派、自由、激进、威权、资本主义、全球主义等）
// * 负值表示偏向标签名称左边的选项（如：左派、保守、温和、自由、社会主义、民族主义等）
export const LABEL_CATEGORIES: CategoryDefinition[] = [
  {
    id: "political-orientation",
    name: "政治倾向",
    description: "政治立场相关分类",
    labels: [
      {
        id: "left-right",
        name: "左派 vs 右派",
        description: "经济政策和社会政策的左右倾向",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 左派, 1: 右派
      },
      {
        id: "liberal-conservative",
        name: "保守派 vs 自由派",
        description: "社会自由度和传统价值观的倾向",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 保守派, 1: 自由派
      },
      {
        id: "radical-moderate",
        name: "温和派 vs 激进派",
        description: "政治立场的激进程度",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 温和派, 1: 激进派
      },
      {
        id: "libertarian-authoritarian",
        name: "自由意志 vs 威权主义",
        description: "个人自由与国家权力的倾向",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 自由意志, 1: 威权主义
      },
      {
        id: "capitalist-socialist",
        name: "社会主义 vs 资本主义",
        description: "经济制度倾向",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 社会主义, 1: 资本主义
      },
      {
        id: "nationalist-globalist",
        name: "民族主义 vs 全球主义",
        description: "国家认同与全球一体化倾向",
        category: "political-orientation",
        scoreRange: [-1, 1] // -1: 民族主义, 1: 全球主义
      }
    ]
  },
  {
    id: "economic-view",
    name: "经济观点",
    description: "经济政策相关分类",
    labels: [
      {
        id: "market-intervention",
        name: "政府干预 vs 市场主导",
        description: "经济政策中市场与政府的角色",
        category: "economic-view",
        scoreRange: [-1, 1] // -1: 政府干预, 1: 市场主导
      },
      {
        id: "wealth-distribution",
        name: "平等分配 vs 自由竞争",
        description: "财富分配政策倾向",
        category: "economic-view",
        scoreRange: [-1, 1] // -1: 平等分配, 1: 自由竞争
      }
    ]
  },
  {
    id: "social-view",
    name: "社会观点",
    description: "社会议题相关分类",
    labels: [
      {
        id: "individual-collective",
        name: "集体主义 vs 个人主义",
        description: "个人与集体利益的优先级",
        category: "social-view",
        scoreRange: [-1, 1] // -1: 集体主义, 1: 个人主义
      },
      {
        id: "traditional-progressive",
        name: "传统派 vs 进步派",
        description: "社会价值观的保守与进步倾向",
        category: "social-view",
        scoreRange: [-1, 1] // -1: 传统派, 1: 进步派
      }
    ]
  },
  {
    id: "technology-view",
    name: "科技观点",
    description: "科技发展和应用相关分类",
    labels: [
      {
        id: "innovation-security",
        name: "安全导向 vs 创新导向",
        description: "在技术发展中对创新和安全的权衡",
        category: "technology-view",
        scoreRange: [-1, 1] // -1: 安全导向, 1: 创新导向
      },
      {
        id: "open-proprietary",
        name: "封闭 vs 开放",
        description: "技术开放性和专有性的倾向",
        category: "technology-view",
        scoreRange: [-1, 1] // -1: 封闭, 1: 开放
      }
    ]
  },
  {
    id: "cultural-view",
    name: "文化观点",
    description: "文化相关分类",
    labels: [
      {
        id: "local-global",
        name: "本土化 vs 全球化",
        description: "文化认同的本土与全球倾向",
        category: "cultural-view",
        scoreRange: [-1, 1] // -1: 本土化, 1: 全球化
      },
      {
        id: "material-spiritual",
        name: "精神 vs 物质",
        description: "价值观中物质与精神的侧重",
        category: "cultural-view",
        scoreRange: [-1, 1] // -1: 精神, 1: 物质
      }
    ]
  },
  {
    id: "environment-view",
    name: "环境观点",
    description: "环境保护相关分类",
    labels: [
      {
        id: "development-protection",
        name: "保护 vs 发展",
        description: "经济发展与环境保护的权衡",
        category: "environment-view",
        scoreRange: [-1, 1] // -1: 保护, 1: 发展
      }
    ]
  }
];
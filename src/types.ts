export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama' | 'custom';

export type AnalysisMode = 'fast' | 'balanced' | 'deep';

export type SupportedPlatform = 'zhihu' | 'reddit' | 'twitter' | 'weibo';

export type MacroCategory = 
  | 'politics'       // 政治 (Politics)
  | 'economy'        // 经济 (Economy)
  | 'society'        // 社会 (Society)
  | 'technology'     // 科技 (Technology)
  | 'culture'        // 文化 (Culture)
  | 'environment'    // 环境 (Environment)
  | 'entertainment'  // 娱乐 (Entertainment)
  | 'lifestyle_career' // 生活与职场 (Lifestyle & Career)
  | 'general';       // 通用/其他

export interface PlatformConfig {
  enabled: boolean;
  baseUrl: string;
  apiEndpoint?: string;
  settings?: Record<string, any>;
}

export interface AppConfig {
  globalEnabled: boolean; // Master switch
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames: Record<string, string>; // e.g. { openai: 'gpt-4' }
  analyzeLimit: number; // Default 15
  enableDebug: boolean;
  analysisMode: AnalysisMode;
  enabledPlatforms: Record<SupportedPlatform, boolean>;
  platformConfigs: Record<SupportedPlatform, PlatformConfig>;
}

export const DEFAULT_CONFIG: AppConfig = {
  globalEnabled: true,
  selectedProvider: 'openai',
  apiKeys: {},
  customBaseUrls: {},
  customModelNames: {},
  analyzeLimit: 15,
  enableDebug: false,
  analysisMode: 'balanced',
  enabledPlatforms: {
    zhihu: true,
    reddit: false,
    twitter: false,
    weibo: false
  },
  platformConfigs: {
    zhihu: {
      enabled: true,
      baseUrl: 'https://www.zhihu.com',
      apiEndpoint: 'https://www.zhihu.com/api/v4'
    },
    reddit: {
      enabled: false,
      baseUrl: 'https://www.reddit.com',
      apiEndpoint: 'https://oauth.reddit.com'
    },
    twitter: {
      enabled: false,
      baseUrl: 'https://twitter.com',
      apiEndpoint: 'https://api.twitter.com'
    },
    weibo: {
      enabled: false,
      baseUrl: 'https://weibo.com',
      apiEndpoint: 'https://api.weibo.com'
    }
  }
};

// --- New History System Types ---

export interface UserBasicInfo {
  name: string;
  headline?: string;
  avatar_url?: string;
  url_token?: string;
}

/**
 * Stores the analysis result for a single macro-category.
 */
export interface CategoryProfile {
  category: string; // e.g., 'politics_society'
  profileData: any; // The full profile JSON object from LLM
  timestamp: number;
  model: string;
  context: string; // The original, specific context string for reference
}

/**
 * Represents a single user's entire history on a specific platform.
 * It contains multiple category-specific profiles.
 */
export interface UserHistoryRecord {
  userId: string;
  platform: SupportedPlatform;
  userInfo?: UserBasicInfo; // Added user info storage
  // A dictionary of profiles, keyed by the macro-category.
  profiles: Record<string, CategoryProfile>; 
  lastUpdated: number; // Timestamp of the last update to any category
}

// Re-export ProfileData for convenience
export interface ProfileData {
  nickname?: string
  topic_classification?: string
  value_orientation?: Array<{ label: string; score: number }>
  summary?: string
  evidence?: Array<{
    quote: string
    analysis: string
    source_title: string
    source_id?: string
  }>
}

// --- Comment Analysis Types ---

export interface CommentItem {
  id: string;
  author: string;
  content: string;
  likes?: number;
  replyTo?: string;
}

export interface CommentAnalysisResult {
  summary: string; // 总体舆论总结
  stance_ratio: {
    support: number; // 支持方比例 (0-1)
    oppose: number;  // 反对方比例 (0-1)
    neutral: number; // 中立/吃瓜比例 (0-1)
  };
  key_points: Array<{
    point: string; // 观点
    count: number; // 提及次数/热度
    type: 'support' | 'oppose' | 'neutral';
    example_quotes: string[]; // 典型评论摘录
  }>;
  sentiment: 'positive' | 'negative' | 'neutral' | 'controversial'; // 总体情绪
}

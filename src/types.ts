export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama' | 'custom';

export type AnalysisMode = 'fast' | 'balanced' | 'deep';

export type SupportedPlatform = 'zhihu' | 'reddit' | 'twitter' | 'weibo';

export interface PlatformConfig {
  enabled: boolean;
  baseUrl: string;
  apiEndpoint?: string;
  settings?: Record<string, any>;
}

export interface AppConfig {
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

// History System Types
export interface HistoryRecord {
  userId: string;
  platform: SupportedPlatform;
  profileData: any; // The full profile JSON object
  context?: string; // The context used when generating this profile
  timestamp: number; // When it was generated
  model: string; // Which model was used
  version: string; // Data structure version
}

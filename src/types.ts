export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama' | 'custom';

export type AnalysisMode = 'fast' | 'balanced' | 'deep';

export type SupportedPlatform = 'zhihu' | 'reddit' | 'twitter' | 'weibo';

export type Language = 'zh-CN' | 'en-US';

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
  language: Language; // Default 'zh-CN'
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames: Record<string, string>; // e.g. { openai: 'gpt-4' }
  analyzeLimit: number; // Default 15
  enableDebug: boolean;
  analysisMode: AnalysisMode; // Default analysis mode for all platforms
  platformAnalysisModes: Record<SupportedPlatform, AnalysisMode>; // Platform-specific analysis modes
  enabledPlatforms: Record<SupportedPlatform, boolean>;
  platformConfigs: Record<SupportedPlatform, PlatformConfig>;
}

// --- Theme Configuration Types ---

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  accent: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSizeBase: string;
  fontSizeSmall: string;
  fontSizeMedium: string;
  fontSizeLarge: string;
  fontWeightNormal: number;
  fontWeightBold: number;
  lineHeight: number;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  small: string;
  medium: string;
  large: string;
}

export interface ThemeShadows {
  small: string;
  medium: string;
  large: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  platformOverrides?: Partial<Record<SupportedPlatform, Partial<ThemeConfig>>>;
}

export interface ExtendedAppConfig extends AppConfig {
  themeId: string;
  themes: Record<string, ThemeConfig>;
}

export const ZHIHU_WHITE_THEME: ThemeConfig = {
  id: 'zhihu-white',
  name: 'Zhihu White Theme',
  description: 'Zhihu-inspired light theme with blue accents',
  colors: {
    primary: '#0084ff',  // 知乎蓝
    secondary: '#3498db',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    accent: '#0084ff'  // 知乎蓝
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: '14px',
    fontSizeSmall: '12px',
    fontSizeMedium: '16px',
    fontSizeLarge: '18px',
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.05)',
    medium: '0 4px 12px rgba(0,0,0,0.1)',
    large: '0 8px 24px rgba(0,0,0,0.15)'
  }
};

export const ZHIHU_BLACK_THEME: ThemeConfig = {
  id: 'zhihu-black',
  name: 'Zhihu Dark Theme',
  description: 'Zhihu-inspired dark theme with blue accents',
  colors: {
    primary: '#0084ff',  // 知乎蓝
    secondary: '#3498db',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#e0e0e0',
    textSecondary: '#aaaaaa',
    border: '#444444',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    accent: '#0084ff'  // 知乎蓝
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: '14px',
    fontSizeSmall: '12px',
    fontSizeMedium: '16px',
    fontSizeLarge: '18px',
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.3)',
    medium: '0 4px 12px rgba(0,0,0,0.4)',
    large: '0 8px 24px rgba(0,0,0,0.5)'
  }
};

export const REDDIT_WHITE_THEME: ThemeConfig = {
  id: 'reddit-white',
  name: 'Reddit White Theme',
  description: 'Reddit-inspired light theme with orangered and periwinkle accents',
  colors: {
    primary: '#FF4500',  // Reddit橘红 (Orangered)
    secondary: '#9494FF',  // 长春花蓝 (Periwinkle)
    background: '#dae0e6',  // Reddit背景色
    surface: '#ffffff',
    text: '#1c1c1c',  // Reddit深灰色文本
    textSecondary: '#6a6a6a',
    border: '#ccc',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    accent: '#FF4500'  // Reddit橘红
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: '14px',
    fontSizeSmall: '12px',
    fontSizeMedium: '16px',
    fontSizeLarge: '18px',
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.05)',
    medium: '0 4px 12px rgba(0,0,0,0.1)',
    large: '0 8px 24px rgba(0,0,0,0.15)'
  }
};

export const REDDIT_BLACK_THEME: ThemeConfig = {
  id: 'reddit-black',
  name: 'Reddit Dark Theme',
  description: 'Reddit-inspired dark theme with orangered and periwinkle accents',
  colors: {
    primary: '#FF4500',  // Reddit橘红 (Orangered)
    secondary: '#9494FF',  // 长春花蓝 (Periwinkle)
    background: '#1a1a1b',  // Reddit暗色背景
    surface: '#272729',
    text: '#d7dadc',  // Reddit暗色文本
    textSecondary: '#a8aab4',
    border: '#474a4e',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    accent: '#FF4500'  // Reddit橘红
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: '14px',
    fontSizeSmall: '12px',
    fontSizeMedium: '16px',
    fontSizeLarge: '18px',
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.3)',
    medium: '0 4px 12px rgba(0,0,0,0.4)',
    large: '0 8px 24px rgba(0,0,0,0.5)'
  }
};







export const DEFAULT_CONFIG: ExtendedAppConfig = {
  globalEnabled: true,
  language: 'zh-CN',
  selectedProvider: 'openai',
  apiKeys: {},
  customBaseUrls: {},
  customModelNames: {},
  analyzeLimit: 15,
  enableDebug: false,
  analysisMode: 'balanced',
  platformAnalysisModes: {
    zhihu: 'balanced',
    reddit: 'balanced',
    twitter: 'balanced',
    weibo: 'balanced'
  },
  enabledPlatforms: {
    zhihu: true,
    reddit: true,
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
      enabled: true,
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
  },
  themeId: 'zhihu-white',
  themes: {
    'zhihu-white': ZHIHU_WHITE_THEME,
    'zhihu-black': ZHIHU_BLACK_THEME,
    'reddit-white': REDDIT_WHITE_THEME,
    'reddit-black': REDDIT_BLACK_THEME
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
  deep_analysis?: { // 深度模式下的额外分析
    has_fallacy: boolean;
    fallacy_type?: string;
    example?: string;
  };
}
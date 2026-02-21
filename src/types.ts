export type AIProvider =
  | "openai"
  | "gemini"
  | "deepseek"
  | "qwen"
  | "qwen-intl"
  | "ollama"
  | "custom";

export type AnalysisMode = "fast" | "balanced" | "deep";

export type SupportedPlatform =
  | "zhihu"
  | "reddit"
  | "twitter"
  | "quora"
  | "weibo";

export type Language = "zh-CN" | "en-US";

export type RedactSensitiveMode = "always" | "sensitive-providers" | "never";

export interface ObservabilityConfig {
  errorMonitoringEnabled: boolean;
  analyticsEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  complianceMonitoringEnabled: boolean;
  allowInProd: boolean;
  prodConsent: boolean;
  endpoint: string;
  sampleRate: number;
  maxQueueSize: number;
}

export type MacroCategory =
  | "politics" // 政治 (Politics)
  | "economy" // 经济 (Economy)
  | "society" // 社会 (Society)
  | "technology" // 科技 (Technology)
  | "culture" // 文化 (Culture)
  | "environment" // 环境 (Environment)
  | "entertainment" // 娱乐 (Entertainment)
  | "lifestyle_career" // 生活与职场 (Lifestyle & Career)
  | "general"; // 通用/其他

export interface PlatformConfig {
  enabled: boolean;
  baseUrl: string;
  apiEndpoint?: string;
  analysisButtonEnabled?: boolean;
  commentAnalysisEnabled?: boolean;
  replyAssistantEnabled?: boolean;
  settings?: Record<string, any>;
}

export interface ReplyAssistantSettings {
  tone: string;
  replyLength: "short" | "medium" | "long";
}

export interface AppConfig {
  configVersion: number;
  globalEnabled: boolean; // Master switch
  language: Language; // Default 'zh-CN'
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames: Record<string, string>; // e.g. { openai: 'gpt-4' }
  analyzeLimit: number; // Default 15
  enableDebug: boolean;
  redactSensitiveMode: RedactSensitiveMode;
  observability: ObservabilityConfig;
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
  successBg: string;
  successText: string;
  successBorder: string;
  warning: string;
  error: string;
  errorBg: string;
  errorText: string;
  errorBorder: string;
  accent: string;
  primaryText: string;
  warningText: string;
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

export const FUTURE_DAY_THEME: ThemeConfig = {
  id: "future-day",
  name: "Future Daylight",
  description: "Bright glassy tech theme with crisp neon highlights",
  colors: {
    primary: "#0ea5e9",
    secondary: "#22c55e",
    background: "#e7f6ff",
    surface: "rgba(255, 255, 255, 0.72)",
    text: "#0b1426",
    textSecondary: "#3b556f",
    border: "rgba(14, 165, 233, 0.25)",
    success: "#16a34a",
    successBg: "rgba(34, 197, 94, 0.18)",
    successText: "#14532d",
    successBorder: "rgba(34, 197, 94, 0.4)",
    warning: "#f59e0b",
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.18)",
    errorText: "#7f1d1d",
    errorBorder: "rgba(239, 68, 68, 0.4)",
    accent: "#38bdf8",
    primaryText: "#ffffff",
    warningText: "#0b1426",
  },
  typography: {
    fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 480,
    fontWeightBold: 680,
    lineHeight: 1.55,
  },
  spacing: {
    xs: "6px",
    sm: "10px",
    md: "18px",
    lg: "26px",
    xl: "34px",
    xxl: "52px",
  },
  borderRadius: {
    small: "10px",
    medium: "16px",
    large: "24px",
  },
  shadows: {
    small: "0 4px 12px rgba(14, 165, 233, 0.14)",
    medium: "0 12px 28px rgba(14, 165, 233, 0.18)",
    large: "0 24px 52px rgba(14, 165, 233, 0.22)",
  },
};

export const FUTURE_NIGHT_THEME: ThemeConfig = {
  id: "future-night",
  name: "Future Night",
  description: "Neon night glass theme with deep cyber contrast",
  colors: {
    primary: "#2de2ff",
    secondary: "#00ffa3",
    background: "#05070f",
    surface: "rgba(8, 16, 28, 0.78)",
    text: "#e3f4ff",
    textSecondary: "#98b6cc",
    border: "rgba(45, 226, 255, 0.22)",
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.2)",
    successText: "#dcfce7",
    successBorder: "rgba(34, 197, 94, 0.45)",
    warning: "#fbbf24",
    error: "#ff6b6b",
    errorBg: "rgba(255, 107, 107, 0.2)",
    errorText: "#ffe4e6",
    errorBorder: "rgba(255, 107, 107, 0.45)",
    accent: "#60f6ff",
    primaryText: "#021217",
    warningText: "#081018",
  },
  typography: {
    fontFamily: "'Orbitron', 'Oxanium', 'Rajdhani', 'Segoe UI', sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 520,
    fontWeightBold: 700,
    lineHeight: 1.6,
  },
  spacing: {
    xs: "6px",
    sm: "10px",
    md: "18px",
    lg: "26px",
    xl: "34px",
    xxl: "52px",
  },
  borderRadius: {
    small: "10px",
    medium: "16px",
    large: "24px",
  },
  shadows: {
    small: "0 4px 14px rgba(0, 255, 163, 0.18)",
    medium: "0 12px 34px rgba(45, 226, 255, 0.24)",
    large: "0 26px 62px rgba(45, 226, 255, 0.32)",
  },
};

export const ZHIHU_WHITE_THEME: ThemeConfig = {
  id: "zhihu-white",
  name: "Zhihu White Theme",
  description: "Zhihu-inspired light theme with blue accents",
  colors: {
    primary: "#0084ff", // 知乎蓝
    secondary: "#3498db",
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#333333",
    textSecondary: "#666666",
    border: "#e0e0e0",
    success: "#27ae60",
    successBg: "#d4edda",
    successText: "#155724",
    successBorder: "#c3e6cb",
    warning: "#f39c12",
    error: "#e74c3c",
    errorBg: "#f8d7da",
    errorText: "#721c24",
    errorBorder: "#f5c6cb",
    accent: "#0084ff", // 知乎蓝
    primaryText: "#ffffff", // 白色文字用于primary背景上
    warningText: "#ffffff", // 白色文字用于warning背景上
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5,
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
  },
  shadows: {
    small: "0 2px 4px rgba(0,0,0,0.05)",
    medium: "0 4px 12px rgba(0,0,0,0.1)",
    large: "0 8px 24px rgba(0,0,0,0.15)",
  },
};

export const ZHIHU_BLACK_THEME: ThemeConfig = {
  id: "zhihu-black",
  name: "Zhihu Dark Theme",
  description: "Zhihu-inspired dark theme with blue accents",
  colors: {
    primary: "#0084ff", // 知乎蓝
    secondary: "#3498db",
    background: "#121212",
    surface: "#1e1e1e",
    text: "#ffffff",
    textSecondary: "#d0d0d0",
    border: "#444444",
    success: "#27ae60",
    successBg: "#27ae60",
    successText: "#ffffff",
    successBorder: "#27ae60",
    warning: "#f39c12",
    error: "#e74c3c",
    errorBg: "#e74c3c",
    errorText: "#ffffff",
    errorBorder: "#e74c3c",
    accent: "#0084ff", // 知乎蓝
    primaryText: "#ffffff", // 白色文字用于primary背景上
    warningText: "#ffffff", // 白色文字用于warning背景上
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5,
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
  },
  shadows: {
    small: "0 2px 4px rgba(0,0,0,0.3)",
    medium: "0 4px 12px rgba(0,0,0,0.4)",
    large: "0 8px 24px rgba(0,0,0,0.5)",
  },
};

export const REDDIT_WHITE_THEME: ThemeConfig = {
  id: "reddit-white",
  name: "Reddit White Theme",
  description:
    "Reddit-inspired light theme with orangered and periwinkle accents",
  colors: {
    primary: "#FF4500", // Reddit橘红 (Orangered)
    secondary: "#9494FF", // 长春花蓝 (Periwinkle)
    background: "#dae0e6", // Reddit背景色
    surface: "#ffffff",
    text: "#1c1c1c", // Reddit深灰色文本
    textSecondary: "#6a6a6a",
    border: "#ccc",
    success: "#27ae60",
    successBg: "#d4edda",
    successText: "#155724",
    successBorder: "#c3e6cb",
    warning: "#f39c12",
    error: "#e74c3c",
    errorBg: "#f8d7da",
    errorText: "#721c24",
    errorBorder: "#f5c6cb",
    accent: "#FF4500", // Reddit橘红
    primaryText: "#ffffff", // 白色文字用于primary背景上
    warningText: "#ffffff", // 白色文字用于warning背景上
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5,
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
  },
  shadows: {
    small: "0 2px 4px rgba(0,0,0,0.05)",
    medium: "0 4px 12px rgba(0,0,0,0.1)",
    large: "0 8px 24px rgba(0,0,0,0.15)",
  },
};

export const REDDIT_BLACK_THEME: ThemeConfig = {
  id: "reddit-black",
  name: "Reddit Dark Theme",
  description:
    "Reddit-inspired dark theme with orangered and periwinkle accents",
  colors: {
    primary: "#FF4500", // Reddit橘红 (Orangered)
    secondary: "#9494FF", // 长春花蓝 (Periwinkle)
    background: "#1a1a1b", // Reddit暗色背景
    surface: "#272729",
    text: "#ffffff", // 白色文本
    textSecondary: "#d0d0d0",
    border: "#474a4e",
    success: "#27ae60",
    successBg: "#27ae60",
    successText: "#ffffff",
    successBorder: "#27ae60",
    warning: "#f39c12",
    error: "#e74c3c",
    errorBg: "#e74c3c",
    errorText: "#ffffff",
    errorBorder: "#e74c3c",
    accent: "#FF4500", // Reddit橘红
    primaryText: "#ffffff", // 白色文字用于primary背景上
    warningText: "#ffffff", // 白色文字用于warning背景上
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeBase: "14px",
    fontSizeSmall: "12px",
    fontSizeMedium: "16px",
    fontSizeLarge: "18px",
    fontWeightNormal: 400,
    fontWeightBold: 600,
    lineHeight: 1.5,
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
  },
  shadows: {
    small: "0 2px 4px rgba(0,0,0,0.3)",
    medium: "0 4px 12px rgba(0,0,0,0.4)",
    large: "0 8px 24px rgba(0,0,0,0.5)",
  },
};

export const CONFIG_VERSION = 8;

export const DEFAULT_CONFIG: ExtendedAppConfig = {
  configVersion: CONFIG_VERSION,
  globalEnabled: true,
  language: "zh-CN",
  selectedProvider: "openai",
  apiKeys: {},
  customBaseUrls: {},
  customModelNames: {},
  analyzeLimit: 15,
  enableDebug: false,
  redactSensitiveMode: "sensitive-providers",
  observability: {
    errorMonitoringEnabled: false,
    analyticsEnabled: false,
    performanceMonitoringEnabled: false,
    complianceMonitoringEnabled: false,
    allowInProd: false,
    prodConsent: false,
    endpoint: "",
    sampleRate: 1,
    maxQueueSize: 200,
  },
  analysisMode: "balanced",
  platformAnalysisModes: {
    zhihu: "balanced",
    reddit: "balanced",
    twitter: "balanced",
    quora: "balanced",
    weibo: "balanced",
  },
  enabledPlatforms: {
    zhihu: true,
    reddit: true,
    twitter: false,
    quora: false,
    weibo: false,
  },
  platformConfigs: {
    zhihu: {
      enabled: true,
      baseUrl: "https://www.zhihu.com",
      apiEndpoint: "https://www.zhihu.com/api/v4",
      analysisButtonEnabled: true,
      commentAnalysisEnabled: true,
      replyAssistantEnabled: true,
      settings: {
        replyAssistant: {
          tone: "客观",
          replyLength: "medium",
        } as ReplyAssistantSettings,
      },
    },
    reddit: {
      enabled: true,
      baseUrl: "https://www.reddit.com",
      apiEndpoint: "https://oauth.reddit.com",
      analysisButtonEnabled: true,
      commentAnalysisEnabled: true,
      replyAssistantEnabled: true,
      settings: {
        replyAssistant: {
          tone: "客观",
          replyLength: "medium",
        } as ReplyAssistantSettings,
      },
    },
    twitter: {
      enabled: false,
      baseUrl: "https://twitter.com",
      apiEndpoint: "https://api.twitter.com",
      analysisButtonEnabled: true,
      commentAnalysisEnabled: true,
      replyAssistantEnabled: true,
      settings: {
        replyAssistant: {
          tone: "客观",
          replyLength: "medium",
        } as ReplyAssistantSettings,
      },
    },
    quora: {
      enabled: false,
      baseUrl: "https://www.quora.com",
      apiEndpoint: "https://www.quora.com/api",
      analysisButtonEnabled: true,
      commentAnalysisEnabled: true,
      replyAssistantEnabled: true,
      settings: {
        replyAssistant: {
          tone: "客观",
          replyLength: "medium",
        } as ReplyAssistantSettings,
      },
    },
    weibo: {
      enabled: false,
      baseUrl: "https://weibo.com",
      apiEndpoint: "https://api.weibo.com",
      analysisButtonEnabled: false,
    },
  },
  themeId: "future-day",
  themes: {
    "future-day": FUTURE_DAY_THEME,
    "future-night": FUTURE_NIGHT_THEME,
    "zhihu-white": ZHIHU_WHITE_THEME,
    "zhihu-black": ZHIHU_BLACK_THEME,
    "reddit-white": REDDIT_WHITE_THEME,
    "reddit-black": REDDIT_BLACK_THEME,
  },
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
  nickname?: string; // Added nickname for compatibility
  userInfo?: UserBasicInfo; // Added user info storage
  // A dictionary of profiles, keyed by the macro-category.
  profiles?: Record<string, CategoryProfile>;
  lastUpdated?: number; // Timestamp of the last update to any category

  // Fields for ProfileCard compatibility
  profileData?: any;
  items?: any[];
  userProfile?: any;
  debugInfo?: any;
  fromCache?: boolean;
  cachedAt?: number;
  cachedContext?: string;
}

// Re-export ProfileData for convenience
export interface ProfileData {
  nickname?: string;
  topic_classification?: string;
  value_orientation?: Array<{ label: string; score: number }>;
  summary?: string;
  evidence?: Array<{
    quote: string;
    analysis: string;
    source_title: string;
    source_id?: string;
  }>;
}

export interface AnalysisProgress {
  percentage?: number;
  elapsedMs?: number;
  estimatedMs?: number;
  overdue?: boolean;
  phase?: "estimate" | "overtime" | "finalizing";
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
    oppose: number; // 反对方比例 (0-1)
    neutral: number; // 中立/吃瓜比例 (0-1)
  };
  key_points: Array<{
    point: string; // 观点
    count: number; // 提及次数/热度
    type: "support" | "oppose" | "neutral";
    example_quotes: string[]; // 典型评论摘录
  }>;
  sentiment: "positive" | "negative" | "neutral" | "controversial"; // 总体情绪
  deep_analysis?: {
    // 深度模式下的额外分析
    has_fallacy: boolean;
    fallacy_type?: string;
    example?: string;
  };
}

export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama';

export interface AppConfig {
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames: Record<string, string>; // e.g. { openai: 'gpt-4' }
  analyzeLimit: number; // Default 15
  enableDebug: boolean; // New field
}

export const DEFAULT_CONFIG: AppConfig = {
  selectedProvider: 'openai',
  apiKeys: {},
  customBaseUrls: {},
  customModelNames: {},
  analyzeLimit: 15,
  enableDebug: false
};

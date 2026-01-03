export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama';

export interface AppConfig {
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
}

export const DEFAULT_CONFIG: AppConfig = {
  selectedProvider: 'openai',
  apiKeys: {},
  customBaseUrls: {}
};

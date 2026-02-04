import { DEFAULT_CONFIG, type ExtendedAppConfig } from "../types"

export class ConfigService {
  private static STORAGE_KEY = "deep_profile_config"
  private static cachedConfig: ExtendedAppConfig | null = null
  private static cacheInitialized = false

  static async getConfig(): Promise<ExtendedAppConfig> {
    try {
      this.initCacheSync();
      // Check if chrome APIs are available
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        console.warn('Chrome API not available, using default config');
        return DEFAULT_CONFIG as ExtendedAppConfig;
      }

      if (this.cachedConfig) {
        return this.cachedConfig;
      }
      
      const result = await chrome.storage.local.get(this.STORAGE_KEY)
      const storedConfig = result[this.STORAGE_KEY] as Partial<ExtendedAppConfig> || {}
      
      // Merge stored config with default config to ensure all fields exist
      //特别注意合并themes字段，保留新增的主题
      const mergedThemes = {
        ...DEFAULT_CONFIG.themes,
        ...(storedConfig.themes || {})
      };
      
      const mergedConfig = { 
        ...DEFAULT_CONFIG, 
        ...storedConfig,
        themes: mergedThemes
      } as ExtendedAppConfig

      this.cachedConfig = mergedConfig;
      return mergedConfig;
    } catch (error) {
      console.error("Failed to get config:", error)
      return DEFAULT_CONFIG as ExtendedAppConfig
    }
  }

  static async saveConfig(config: ExtendedAppConfig): Promise<void> {
    try {
      this.initCacheSync();
      await chrome.storage.local.set({ [this.STORAGE_KEY]: config })
      this.cachedConfig = config;
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  }

  static getConfigSync(): ExtendedAppConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    return DEFAULT_CONFIG as ExtendedAppConfig;
  }

  static async updateApiKey(provider: string, apiKey: string): Promise<void> {
    const currentConfig = await this.getConfig()
    const newConfig = {
      ...currentConfig,
      apiKeys: {
        ...currentConfig.apiKeys,
        [provider]: apiKey
      }
    }
    await this.saveConfig(newConfig)
  }

  static initCacheSync(): void {
    if (this.cacheInitialized) return;
    this.cacheInitialized = true;

    try {
      if (!chrome?.storage?.onChanged) return;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[this.STORAGE_KEY]) {
          this.cachedConfig = changes[this.STORAGE_KEY].newValue || null;
        }
      });
    } catch (e) {
      // Ignore in non-extension contexts
    }
  }

  static clearCache(): void {
    this.cachedConfig = null;
    this.cacheInitialized = false;
  }
}

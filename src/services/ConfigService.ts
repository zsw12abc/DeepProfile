import { DEFAULT_CONFIG, type ExtendedAppConfig } from "../types"

export class ConfigService {
  private static STORAGE_KEY = "deep_profile_config"
  private static cachedConfig: ExtendedAppConfig | null = null
  private static cacheInitialized = false
  private static configPromise: Promise<ExtendedAppConfig> | null = null
  private static pendingWrite: Promise<void> | null = null

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

      if (this.configPromise) {
        return await this.configPromise;
      }

      this.configPromise = (async () => {
        try {
          const result = await chrome.storage.local.get(this.STORAGE_KEY)
          const storedConfig = result[this.STORAGE_KEY] as Partial<ExtendedAppConfig> || {}
          const mergedConfig = this.mergeConfig(storedConfig);
          this.cachedConfig = mergedConfig;
          return mergedConfig;
        } finally {
          this.configPromise = null;
        }
      })();

      return await this.configPromise;
    } catch (error) {
      console.error("Failed to get config:", error)
      return DEFAULT_CONFIG as ExtendedAppConfig
    }
  }

  static async saveConfig(config: ExtendedAppConfig): Promise<void> {
    let currentWrite: Promise<void> | null = null;
    try {
      this.initCacheSync();
      if (this.configPromise) {
        await this.configPromise;
      }

      const write = async () => {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: config })
        this.cachedConfig = config;
      };

      currentWrite = this.pendingWrite
        ? this.pendingWrite.then(write, write)
        : write();

      this.pendingWrite = currentWrite;
      await currentWrite;
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    } finally {
      if (currentWrite && this.pendingWrite === currentWrite) {
        this.pendingWrite = null;
      }
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
    this.configPromise = null;
    this.pendingWrite = null;
  }

  private static mergeConfig(storedConfig: Partial<ExtendedAppConfig>): ExtendedAppConfig {
    const mergedThemes = {
      ...DEFAULT_CONFIG.themes,
      ...(storedConfig.themes || {})
    };

    const mergedApiKeys = {
      ...DEFAULT_CONFIG.apiKeys,
      ...(storedConfig.apiKeys || {})
    };

    const mergedCustomBaseUrls = {
      ...DEFAULT_CONFIG.customBaseUrls,
      ...(storedConfig.customBaseUrls || {})
    };

    const mergedCustomModelNames = {
      ...DEFAULT_CONFIG.customModelNames,
      ...(storedConfig.customModelNames || {})
    };

    const mergedEnabledPlatforms = {
      ...DEFAULT_CONFIG.enabledPlatforms,
      ...(storedConfig.enabledPlatforms || {})
    };

    const mergedPlatformAnalysisModes = {
      ...DEFAULT_CONFIG.platformAnalysisModes,
      ...(storedConfig.platformAnalysisModes || {})
    };

    const mergedPlatformConfigs: ExtendedAppConfig["platformConfigs"] = {
      ...DEFAULT_CONFIG.platformConfigs
    };

    for (const [platform, config] of Object.entries(storedConfig.platformConfigs || {})) {
      mergedPlatformConfigs[platform as keyof ExtendedAppConfig["platformConfigs"]] = {
        ...(DEFAULT_CONFIG.platformConfigs as Record<string, any>)[platform],
        ...config
      };
    }

    return {
      ...DEFAULT_CONFIG,
      ...storedConfig,
      apiKeys: mergedApiKeys,
      customBaseUrls: mergedCustomBaseUrls,
      customModelNames: mergedCustomModelNames,
      enabledPlatforms: mergedEnabledPlatforms,
      platformAnalysisModes: mergedPlatformAnalysisModes,
      platformConfigs: mergedPlatformConfigs,
      themes: mergedThemes
    } as ExtendedAppConfig;
  }
}

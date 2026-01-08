import { DEFAULT_CONFIG, type ExtendedAppConfig } from "../types"

export class ConfigService {
  private static STORAGE_KEY = "deep_profile_config"

  static async getConfig(): Promise<ExtendedAppConfig> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY)
      const storedConfig = result[this.STORAGE_KEY] as Partial<ExtendedAppConfig> || {}
      // Merge stored config with default config to ensure all fields exist
      return { ...DEFAULT_CONFIG, ...storedConfig } as ExtendedAppConfig
    } catch (error) {
      console.error("Failed to get config:", error)
      return DEFAULT_CONFIG as ExtendedAppConfig
    }
  }

  static async saveConfig(config: ExtendedAppConfig): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: config })
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
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
}
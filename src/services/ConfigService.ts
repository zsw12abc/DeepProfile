import { DEFAULT_CONFIG, type AppConfig } from "../types"

export class ConfigService {
  private static STORAGE_KEY = "deep_profile_config"

  static async getConfig(): Promise<AppConfig> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY)
      return (result[this.STORAGE_KEY] as AppConfig) || DEFAULT_CONFIG
    } catch (error) {
      console.error("Failed to get config:", error)
      return DEFAULT_CONFIG
    }
  }

  static async saveConfig(config: AppConfig): Promise<void> {
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

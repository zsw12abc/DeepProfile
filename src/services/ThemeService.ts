import { DEFAULT_CONFIG, type ExtendedAppConfig, type ThemeConfig } from "../types";

export class ThemeService {
  private static STORAGE_KEY = "deep_profile_config";
  private static instance: ThemeService;
  private currentTheme: ThemeConfig;

  private constructor() {
    this.currentTheme = DEFAULT_CONFIG.themes['default'] || DEFAULT_CONFIG.themes['default'];
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * 获取当前主题
   */
  public getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  /**
   * 应用特定主题
   */
  public async applyTheme(themeId: string): Promise<void> {
    try {
      const config = await this.getConfig();
      const theme = config.themes[themeId];
      
      if (!theme) {
        console.warn(`Theme ${themeId} not found, falling back to default`);
        this.currentTheme = config.themes['default'] || DEFAULT_CONFIG.themes['default'];
      } else {
        this.currentTheme = theme;
      }
      
      // 保存主题ID到配置
      await this.updateConfig({ ...config, themeId });
    } catch (error) {
      console.error("Failed to apply theme:", error);
    }
  }

  /**
   * 获取配置
   */
  private async getConfig(): Promise<ExtendedAppConfig> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const storedConfig = result[this.STORAGE_KEY] as Partial<ExtendedAppConfig> || {};
      // Merge stored config with default config to ensure all fields exist
      return { ...DEFAULT_CONFIG, ...storedConfig } as ExtendedAppConfig;
    } catch (error) {
      console.error("Failed to get config:", error);
      return DEFAULT_CONFIG as ExtendedAppConfig;
    }
  }

  /**
   * 更新配置
   */
  private async updateConfig(config: ExtendedAppConfig): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: config });
    } catch (error) {
      console.error("Failed to save config:", error);
      throw error;
    }
  }

  /**
   * 添加新主题
   */
  public async addTheme(theme: ThemeConfig): Promise<void> {
    const config = await this.getConfig();
    const updatedThemes = { ...config.themes, [theme.id]: theme };
    
    await this.updateConfig({ ...config, themes: updatedThemes });
    
    // 如果这是当前主题，则应用它
    if (config.themeId === theme.id) {
      this.currentTheme = theme;
    }
  }

  /**
   * 删除主题
   */
  public async deleteTheme(themeId: string): Promise<void> {
    if (themeId === 'default' || themeId === 'dark' || themeId === 'compact') {
      throw new Error("Cannot delete built-in themes");
    }

    const config = await this.getConfig();
    const updatedThemes = { ...config.themes };
    delete updatedThemes[themeId];

    // 如果删除的是当前主题，切换回默认主题
    let newThemeId = config.themeId;
    if (config.themeId === themeId) {
      newThemeId = 'default';
      this.currentTheme = config.themes['default'] || DEFAULT_CONFIG.themes['default'];
    }

    await this.updateConfig({ ...config, themes: updatedThemes, themeId: newThemeId });
  }

  /**
   * 获取所有可用主题
   */
  public async getAllThemes(): Promise<ThemeConfig[]> {
    const config = await this.getConfig();
    return Object.values(config.themes);
  }

  /**
   * 初始化主题
   */
  public async initialize(): Promise<void> {
    try {
      const config = await this.getConfig();
      const theme = config.themes[config.themeId];
      
      if (theme) {
        this.currentTheme = theme;
      } else {
        // 如果配置的主题不存在，使用默认主题
        this.currentTheme = config.themes['default'] || DEFAULT_CONFIG.themes['default'];
        // 同时更新配置
        await this.updateConfig({ ...config, themeId: 'default' });
      }
    } catch (error) {
      console.error("Failed to initialize theme:", error);
      this.currentTheme = DEFAULT_CONFIG.themes['default'];
    }
  }
}
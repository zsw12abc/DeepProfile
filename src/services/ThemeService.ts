import {
  DEFAULT_CONFIG,
  type ExtendedAppConfig,
  type ThemeConfig,
} from "../types";

export class ThemeService {
  private static STORAGE_KEY = "deep_profile_config";
  private static instance: ThemeService;
  private currentTheme: ThemeConfig;

  private constructor() {
    this.currentTheme =
      DEFAULT_CONFIG.themes["future-day"] ||
      Object.values(DEFAULT_CONFIG.themes)[0];
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
        this.currentTheme =
          config.themes["future-day"] ||
          DEFAULT_CONFIG.themes["future-day"] ||
          Object.values(DEFAULT_CONFIG.themes)[0];
      } else {
        this.currentTheme = theme;
      }

      // 保存主题ID到配置
      await this.updateConfig({ ...config, themeId });

      // 应用主题到整个页面
      this.applyThemeToPage(this.currentTheme);
    } catch (error) {
      console.error("Failed to apply theme:", error);
    }
  }

  /**
   * 应用主题样式到整个页面
   */
  private applyThemeToPage(theme: ThemeConfig): void {
    // 创建或更新CSS变量
    const root = document.documentElement;

    // 主题颜色
    root.style.setProperty("--theme-primary", theme.colors.primary);
    root.style.setProperty("--theme-secondary", theme.colors.secondary);
    root.style.setProperty("--theme-background", theme.colors.background);
    root.style.setProperty("--theme-surface", theme.colors.surface);
    root.style.setProperty("--theme-text", theme.colors.text);
    root.style.setProperty(
      "--theme-text-secondary",
      theme.colors.textSecondary,
    );
    root.style.setProperty("--theme-border", theme.colors.border);
    root.style.setProperty("--theme-success", theme.colors.success);
    root.style.setProperty("--theme-success-bg", theme.colors.successBg);
    root.style.setProperty("--theme-success-text", theme.colors.successText);
    root.style.setProperty(
      "--theme-success-border",
      theme.colors.successBorder,
    );
    root.style.setProperty("--theme-warning", theme.colors.warning);
    root.style.setProperty("--theme-error", theme.colors.error);
    root.style.setProperty("--theme-error-bg", theme.colors.errorBg);
    root.style.setProperty("--theme-error-text", theme.colors.errorText);
    root.style.setProperty("--theme-error-border", theme.colors.errorBorder);
    root.style.setProperty("--theme-accent", theme.colors.accent);
    root.style.setProperty("--theme-primary-text", theme.colors.primaryText);
    root.style.setProperty("--theme-warning-text", theme.colors.warningText);

    // 排版
    root.style.setProperty("--theme-font-family", theme.typography.fontFamily);
    root.style.setProperty(
      "--theme-font-size-base",
      theme.typography.fontSizeBase,
    );
    root.style.setProperty(
      "--theme-font-size-small",
      theme.typography.fontSizeSmall,
    );
    root.style.setProperty(
      "--theme-font-size-medium",
      theme.typography.fontSizeMedium,
    );
    root.style.setProperty(
      "--theme-font-size-large",
      theme.typography.fontSizeLarge,
    );
    root.style.setProperty(
      "--theme-font-weight-normal",
      theme.typography.fontWeightNormal.toString(),
    );
    root.style.setProperty(
      "--theme-font-weight-bold",
      theme.typography.fontWeightBold.toString(),
    );
    root.style.setProperty(
      "--theme-line-height",
      theme.typography.lineHeight.toString(),
    );

    // 间距
    root.style.setProperty("--theme-spacing-xs", theme.spacing.xs);
    root.style.setProperty("--theme-spacing-sm", theme.spacing.sm);
    root.style.setProperty("--theme-spacing-md", theme.spacing.md);
    root.style.setProperty("--theme-spacing-lg", theme.spacing.lg);
    root.style.setProperty("--theme-spacing-xl", theme.spacing.xl);
    root.style.setProperty("--theme-spacing-xxl", theme.spacing.xxl);

    // 圆角
    root.style.setProperty(
      "--theme-border-radius-small",
      theme.borderRadius.small,
    );
    root.style.setProperty(
      "--theme-border-radius-medium",
      theme.borderRadius.medium,
    );
    root.style.setProperty(
      "--theme-border-radius-large",
      theme.borderRadius.large,
    );

    // 阴影
    root.style.setProperty("--theme-shadow-small", theme.shadows.small);
    root.style.setProperty("--theme-shadow-medium", theme.shadows.medium);
    root.style.setProperty("--theme-shadow-large", theme.shadows.large);
  }

  /**
   * 获取配置
   */
  private async getConfig(): Promise<ExtendedAppConfig> {
    try {
      const result = await chrome.storage.local.get(ThemeService.STORAGE_KEY);
      const storedConfig =
        (result[ThemeService.STORAGE_KEY] as Partial<ExtendedAppConfig>) || {};

      // Merge stored config with default config to ensure all fields exist
      //特别注意合并themes字段，保留新增的主题
      const mergedThemes = {
        ...DEFAULT_CONFIG.themes,
        ...(storedConfig.themes || {}),
      };

      return {
        ...DEFAULT_CONFIG,
        ...storedConfig,
        themes: mergedThemes,
      } as ExtendedAppConfig;
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
      await chrome.storage.local.set({ [ThemeService.STORAGE_KEY]: config });
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
      this.applyThemeToPage(theme);
    }
  }

  /**
   * 删除主题
   */
  public async deleteTheme(themeId: string): Promise<void> {
    if (
      themeId === "future-day" ||
      themeId === "future-night" ||
      themeId === "zhihu-white" ||
      themeId === "zhihu-black" ||
      themeId === "reddit-white" ||
      themeId === "reddit-black"
    ) {
      throw new Error("Cannot delete built-in themes");
    }

    const config = await this.getConfig();
    const updatedThemes = { ...config.themes };
    delete updatedThemes[themeId];

    // 如果删除的是当前主题，切换回默认主题
    let newThemeId = config.themeId;
    if (config.themeId === themeId) {
      newThemeId = "future-day";
      this.currentTheme =
        config.themes["future-day"] ||
        DEFAULT_CONFIG.themes["future-day"] ||
        Object.values(DEFAULT_CONFIG.themes)[0];
      this.applyThemeToPage(this.currentTheme);
    }

    await this.updateConfig({
      ...config,
      themes: updatedThemes,
      themeId: newThemeId,
    });
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
      await this.getConfig();

      // 清理旧主题并确保只保留内置主题
      await this.cleanupOldThemes();

      // 重新获取配置以确保旧主题已被移除
      const updatedConfig = await this.getConfig();
      const theme = updatedConfig.themes[updatedConfig.themeId];

      if (theme) {
        this.currentTheme = theme;
      } else {
        // 如果配置的主题不存在，使用默认主题
        this.currentTheme =
          updatedConfig.themes["future-day"] ||
          DEFAULT_CONFIG.themes["future-day"] ||
          Object.values(DEFAULT_CONFIG.themes)[0];
        // 同时更新配置
        await this.updateConfig({ ...updatedConfig, themeId: "future-day" });
      }

      // 应用当前主题到页面
      this.applyThemeToPage(this.currentTheme);
    } catch (error) {
      console.error("Failed to initialize theme:", error);
      this.currentTheme =
        DEFAULT_CONFIG.themes["zhihu-white"] ||
        Object.values(DEFAULT_CONFIG.themes)[0];
      this.applyThemeToPage(this.currentTheme);
    }
  }

  /**
   * 清理旧主题，确保只保留内置主题
   */
  private async cleanupOldThemes(): Promise<void> {
    const config = await this.getConfig();
    const oldThemeIds = ["default", "dark", "compact"];
    const hasOldThemes = oldThemeIds.some(
      (id) => config.themes && config.themes[id],
    );

    if (hasOldThemes) {
      console.log("发现旧主题，正在清理...");

      // 创建新主题对象，只保留新主题
      const newThemes = { ...config.themes };
      oldThemeIds.forEach((id) => {
        if (newThemes[id]) {
          delete newThemes[id];
          console.log(`已移除旧主题: ${id}`);
        }
      });

      // 确保内置主题存在
      const builtinThemes = [
        "future-day",
        "future-night",
        "zhihu-white",
        "zhihu-black",
        "reddit-white",
        "reddit-black",
      ];
      builtinThemes.forEach((id) => {
        if (!newThemes[id]) {
          newThemes[id] = DEFAULT_CONFIG.themes[id];
          console.log(`已添加缺失的内置主题: ${id}`);
        }
      });

      // 如果当前主题是旧主题，切换到新默认主题
      let newThemeId = config.themeId;
      if (oldThemeIds.includes(config.themeId)) {
        newThemeId = "future-day";
        console.log(`当前主题为旧主题，切换到默认主题: ${newThemeId}`);
      }

      await this.updateConfig({
        ...config,
        themes: newThemes,
        themeId: newThemeId,
      });
      console.log("旧主题清理完成");
    }
  }
}

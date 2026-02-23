import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONFIG, type ReplyAssistantSettings, type SupportedPlatform } from "~types";
import { ConfigService } from "~services/ConfigService";
import { isDarkThemeId } from "../zhihu-reply-assistant-utils";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import type { SiteSettingsState, ThemeState } from "./types";

interface UseReplyAssistantConfigOptions {
  platform: SupportedPlatform;
  defaultSettings: ReplyAssistantSettings;
  themeFallback: Omit<ThemeState, "isDark">;
}

export const useReplyAssistantConfig = ({
  platform,
  defaultSettings,
  themeFallback,
}: UseReplyAssistantConfigOptions) => {
  const [settings, setSettings] = useState<ReplyAssistantSettings>(defaultSettings);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsState>(DEFAULT_SITE_SETTINGS);
  const [enabled, setEnabled] = useState(true);
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    const defaultTheme = DEFAULT_CONFIG.themes[DEFAULT_CONFIG.themeId];
    return {
      isDark: isDarkThemeId(DEFAULT_CONFIG.themeId),
      primary: defaultTheme?.colors.primary || themeFallback.primary,
      secondary: defaultTheme?.colors.secondary || themeFallback.secondary,
      text: defaultTheme?.colors.text || themeFallback.text,
      textSecondary: defaultTheme?.colors.textSecondary || themeFallback.textSecondary,
      border: defaultTheme?.colors.border || themeFallback.border,
      surface: defaultTheme?.colors.surface || themeFallback.surface,
      background: defaultTheme?.colors.background || themeFallback.background,
      accent: defaultTheme?.colors.accent || themeFallback.accent,
      primaryText: defaultTheme?.colors.primaryText || themeFallback.primaryText,
      success: defaultTheme?.colors.success || themeFallback.success,
      error: defaultTheme?.colors.error || themeFallback.error,
      fontFamily: defaultTheme?.typography.fontFamily || themeFallback.fontFamily,
      shadow: defaultTheme?.shadows.large || themeFallback.shadow,
    };
  });

  const saveSettings = useCallback(
    async (next: ReplyAssistantSettings) => {
      const config = await ConfigService.getConfig();
      const platformConfig = config.platformConfigs[platform];
      await ConfigService.saveConfig({
        ...config,
        platformConfigs: {
          ...config.platformConfigs,
          [platform]: {
            ...platformConfig,
            settings: {
              ...(platformConfig.settings || {}),
              replyAssistant: next,
            },
          },
        },
      });
    },
    [platform],
  );

  const updateConfig = useCallback(async (updater: (cfg: any) => any) => {
    const current = await ConfigService.getConfig();
    const next = updater(current);
    await ConfigService.saveConfig(next);
  }, []);

  const loadSettings = useCallback(async () => {
    const config = await ConfigService.getConfig();
    const platformConfig = config.platformConfigs[platform];
    const assistantSettings = platformConfig.settings?.replyAssistant || defaultSettings;

    setSettings({
      tone: assistantSettings.tone || defaultSettings.tone,
      replyLength: assistantSettings.replyLength || defaultSettings.replyLength,
    });

    setSiteSettings({
      platformEnabled: config.enabledPlatforms?.[platform] ?? DEFAULT_SITE_SETTINGS.platformEnabled,
      analysisButtonEnabled: platformConfig.analysisButtonEnabled ?? DEFAULT_SITE_SETTINGS.analysisButtonEnabled,
      commentAnalysisEnabled: platformConfig.commentAnalysisEnabled ?? DEFAULT_SITE_SETTINGS.commentAnalysisEnabled,
      replyAssistantEnabled: platformConfig.replyAssistantEnabled ?? DEFAULT_SITE_SETTINGS.replyAssistantEnabled,
      analysisMode: config.platformAnalysisModes?.[platform] ?? DEFAULT_SITE_SETTINGS.analysisMode,
      analyzeLimit: config.analyzeLimit || DEFAULT_SITE_SETTINGS.analyzeLimit,
    });

    setEnabled(
      (config.globalEnabled ?? true) &&
        (config.enabledPlatforms?.[platform] ?? true) &&
        (platformConfig.replyAssistantEnabled ?? true),
    );

    const activeTheme = config.themes?.[config.themeId] || DEFAULT_CONFIG.themes[config.themeId];
    if (activeTheme) {
      setThemeState({
        isDark: isDarkThemeId(config.themeId),
        primary: activeTheme.colors.primary,
        secondary: activeTheme.colors.secondary,
        text: activeTheme.colors.text,
        textSecondary: activeTheme.colors.textSecondary,
        border: activeTheme.colors.border,
        surface: activeTheme.colors.surface,
        background: activeTheme.colors.background,
        accent: activeTheme.colors.accent,
        primaryText: activeTheme.colors.primaryText,
        success: activeTheme.colors.success,
        error: activeTheme.colors.error,
        fontFamily: activeTheme.typography.fontFamily,
        shadow: activeTheme.shadows.large,
      });
    }
  }, [defaultSettings, platform]);

  useEffect(() => {
    loadSettings();
    const onStorageChange = async (changes: any, areaName: string) => {
      if (areaName === "local" && changes.deep_profile_config) {
        await loadSettings();
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, [loadSettings]);

  return {
    settings,
    setSettings,
    siteSettings,
    setSiteSettings,
    enabled,
    setEnabled,
    themeState,
    setThemeState,
    saveSettings,
    updateConfig,
    reloadSettings: loadSettings,
  };
};

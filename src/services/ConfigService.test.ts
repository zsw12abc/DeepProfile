import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';
import { CONFIG_VERSION, DEFAULT_CONFIG, type ExtendedAppConfig } from '../types';

// Mock chrome.storage.local
const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
};

global.chrome = {
  storage: {
    local: storageMock,
  },
} as any;

const buildConfig = (overrides: Partial<ExtendedAppConfig>): ExtendedAppConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
  apiKeys: { ...DEFAULT_CONFIG.apiKeys, ...(overrides.apiKeys || {}) },
  customBaseUrls: { ...DEFAULT_CONFIG.customBaseUrls, ...(overrides.customBaseUrls || {}) },
  customModelNames: { ...DEFAULT_CONFIG.customModelNames, ...(overrides.customModelNames || {}) },
  enabledPlatforms: { ...DEFAULT_CONFIG.enabledPlatforms, ...(overrides.enabledPlatforms || {}) },
  platformAnalysisModes: { ...DEFAULT_CONFIG.platformAnalysisModes, ...(overrides.platformAnalysisModes || {}) },
  platformConfigs: { ...DEFAULT_CONFIG.platformConfigs, ...(overrides.platformConfigs || {}) },
  themes: { ...DEFAULT_CONFIG.themes, ...(overrides.themes || {}) }
});

describe('ConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ConfigService.clearCache();
  });

  it('should return default config when storage is empty', async () => {
    storageMock.get.mockResolvedValue({});
    const config = await ConfigService.getConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(storageMock.get).toHaveBeenCalledWith('deep_profile_config');
  });

  it('should return stored config when available', async () => {
    const storedConfig = buildConfig({
      selectedProvider: 'deepseek',
      apiKeys: { deepseek: 'test-key' },
      customBaseUrls: {},
      customModelNames: {},
      redactSensitiveMode: 'sensitive-providers',
      enabledPlatforms: {
        zhihu: true,
        twitter: false,
        weibo: false,
        reddit: true
      },
      platformAnalysisModes: {
        zhihu: 'balanced',
        twitter: 'balanced',
        weibo: 'balanced',
        reddit: 'balanced'
      },
      platformConfigs: {
        zhihu: {
          apiEndpoint: 'https://www.zhihu.com/api/v4',
          baseUrl: 'https://www.zhihu.com',
          enabled: true
        },
        twitter: {
          apiEndpoint: 'https://api.twitter.com',
          baseUrl: 'https://twitter.com',
          enabled: false
        },
        weibo: {
          apiEndpoint: 'https://api.weibo.com',
          baseUrl: 'https://weibo.com',
          enabled: false
        },
        reddit: {
          apiEndpoint: 'https://oauth.reddit.com',
          baseUrl: 'https://www.reddit.com',
          enabled: true
        }
      },
      // Include theme-related fields to make the config complete
      themeId: 'zhihu-white',
      themes: DEFAULT_CONFIG.themes
    });
    storageMock.get.mockResolvedValue({ deep_profile_config: storedConfig });
    const config = await ConfigService.getConfig();
    expect(config).toEqual(storedConfig);
  });

  it('should save config correctly', async () => {
    const newConfig = buildConfig({
      selectedProvider: 'gemini',
      apiKeys: { gemini: 'gemini-key' },
      customBaseUrls: {},
      customModelNames: {},
      redactSensitiveMode: 'sensitive-providers',
      enabledPlatforms: {
        zhihu: true,
        twitter: false,
        weibo: false,
        reddit: true
      },
      platformAnalysisModes: {
        zhihu: 'balanced',
        twitter: 'balanced',
        weibo: 'balanced',
        reddit: 'balanced'
      },
      platformConfigs: {
        zhihu: {
          apiEndpoint: 'https://www.zhihu.com/api/v4',
          baseUrl: 'https://www.zhihu.com',
          enabled: true
        },
        twitter: {
          apiEndpoint: 'https://api.twitter.com',
          baseUrl: 'https://twitter.com',
          enabled: false
        },
        weibo: {
          apiEndpoint: 'https://api.weibo.com',
          baseUrl: 'https://weibo.com',
          enabled: false
        },
        reddit: {
          apiEndpoint: 'https://oauth.reddit.com',
          baseUrl: 'https://www.reddit.com',
          enabled: true
        }
      },
      themeId: 'zhihu-white',
      themes: DEFAULT_CONFIG.themes
    });
    await ConfigService.saveConfig(newConfig as any);
    expect(storageMock.set).toHaveBeenCalledWith({ deep_profile_config: newConfig });
  });

  it('should update api key correctly', async () => {
    const initialConfig = buildConfig({
      selectedProvider: 'openai',
      apiKeys: { openai: 'old-key' },
      customBaseUrls: {},
      customModelNames: {},
      redactSensitiveMode: 'sensitive-providers',
      enabledPlatforms: {
        zhihu: true,
        twitter: false,
        weibo: false,
        reddit: true
      },
      platformAnalysisModes: {
        zhihu: 'balanced',
        twitter: 'balanced',
        weibo: 'balanced',
        reddit: 'balanced'
      },
      platformConfigs: {
        zhihu: {
          apiEndpoint: 'https://www.zhihu.com/api/v4',
          baseUrl: 'https://www.zhihu.com',
          enabled: true
        },
        twitter: {
          apiEndpoint: 'https://api.twitter.com',
          baseUrl: 'https://twitter.com',
          enabled: false
        },
        weibo: {
          apiEndpoint: 'https://api.weibo.com',
          baseUrl: 'https://weibo.com',
          enabled: false
        },
        reddit: {
          apiEndpoint: 'https://oauth.reddit.com',
          baseUrl: 'https://www.reddit.com',
          enabled: true
        }
      },
      themeId: 'zhihu-white',
      themes: DEFAULT_CONFIG.themes
    });
    storageMock.get.mockResolvedValue({ deep_profile_config: initialConfig });

    await ConfigService.updateApiKey('openai', 'new-key');

    const expectedConfig = {
      ...initialConfig,
      apiKeys: { openai: 'new-key' },
    };
    expect(storageMock.set).toHaveBeenCalledWith({ deep_profile_config: expectedConfig });
  });

  it('should migrate older config versions and fill missing defaults', async () => {
    const legacyConfig = {
      configVersion: 0,
      selectedProvider: 'openai',
      apiKeys: { openai: 'legacy-key' },
      enabledPlatforms: { zhihu: true }
    };

    storageMock.get.mockResolvedValue({ deep_profile_config: legacyConfig });
    const config = await ConfigService.getConfig();

    expect(config.configVersion).toBe(CONFIG_VERSION);
    expect(config.redactSensitiveMode).toBe(DEFAULT_CONFIG.redactSensitiveMode);
    expect(config.enabledPlatforms.quora).toBe(DEFAULT_CONFIG.enabledPlatforms.quora);
    expect(config.platformConfigs.quora).toEqual(DEFAULT_CONFIG.platformConfigs.quora);
  });

  it('should cache config after first load', async () => {
    storageMock.get.mockResolvedValue({ deep_profile_config: buildConfig({ selectedProvider: 'openai' }) });

    const first = await ConfigService.getConfig();
    const second = await ConfigService.getConfig();

    expect(first).toEqual(second);
    expect(storageMock.get).toHaveBeenCalledTimes(1);
  });

  it('should return cached config after save without extra read', async () => {
    storageMock.get.mockResolvedValue({});
    const saved = buildConfig({ selectedProvider: 'gemini', apiKeys: { gemini: 'test' } });

    await ConfigService.saveConfig(saved);
    const config = await ConfigService.getConfig();

    expect(config).toEqual(saved);
    expect(storageMock.get).not.toHaveBeenCalled();
  });
});

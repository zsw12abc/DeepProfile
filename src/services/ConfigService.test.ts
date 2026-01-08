import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';
import { DEFAULT_CONFIG } from '../types';

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

describe('ConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default config when storage is empty', async () => {
    storageMock.get.mockResolvedValue({});
    const config = await ConfigService.getConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(storageMock.get).toHaveBeenCalledWith('deep_profile_config');
  });

  it('should return stored config when available', async () => {
    const storedConfig = {
      selectedProvider: 'deepseek',
      apiKeys: { deepseek: 'test-key' },
      customBaseUrls: {},
      customModelNames: {},
      globalEnabled: true,
      language: 'zh-CN',
      analysisMode: 'balanced',
      analyzeLimit: 15,
      enableDebug: false,
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
    };
    storageMock.get.mockResolvedValue({ deep_profile_config: storedConfig });
    const config = await ConfigService.getConfig();
    expect(config).toEqual(storedConfig);
  });

  it('should save config correctly', async () => {
    const newConfig = {
      selectedProvider: 'gemini',
      apiKeys: { gemini: 'gemini-key' },
      customBaseUrls: {},
      customModelNames: {},
      globalEnabled: true,
      language: 'zh-CN',
      analysisMode: 'balanced',
      analyzeLimit: 15,
      enableDebug: false,
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
    };
    await ConfigService.saveConfig(newConfig);
    expect(storageMock.set).toHaveBeenCalledWith({ deep_profile_config: newConfig });
  });

  it('should update api key correctly', async () => {
    const initialConfig = {
      selectedProvider: 'openai',
      apiKeys: { openai: 'old-key' },
      customBaseUrls: {},
      customModelNames: {},
      globalEnabled: true,
      language: 'zh-CN',
      analysisMode: 'balanced',
      analyzeLimit: 15,
      enableDebug: false,
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
    };
    storageMock.get.mockResolvedValue({ deep_profile_config: initialConfig });

    await ConfigService.updateApiKey('openai', 'new-key');

    const expectedConfig = {
      ...initialConfig,
      apiKeys: { openai: 'new-key' },
    };
    expect(storageMock.set).toHaveBeenCalledWith({ deep_profile_config: expectedConfig });
  });
});
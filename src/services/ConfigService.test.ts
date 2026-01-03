import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';
import { DEFAULT_CONFIG, type AppConfig } from '../types';

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
    const storedConfig: AppConfig = {
      selectedProvider: 'deepseek',
      apiKeys: { deepseek: 'test-key' },
      customBaseUrls: {},
    };
    storageMock.get.mockResolvedValue({ deep_profile_config: storedConfig });
    const config = await ConfigService.getConfig();
    expect(config).toEqual(storedConfig);
  });

  it('should save config correctly', async () => {
    const newConfig: AppConfig = {
      selectedProvider: 'gemini',
      apiKeys: { gemini: 'gemini-key' },
      customBaseUrls: {},
    };
    await ConfigService.saveConfig(newConfig);
    expect(storageMock.set).toHaveBeenCalledWith({ deep_profile_config: newConfig });
  });

  it('should update api key correctly', async () => {
    const initialConfig: AppConfig = {
      selectedProvider: 'openai',
      apiKeys: { openai: 'old-key' },
      customBaseUrls: {},
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

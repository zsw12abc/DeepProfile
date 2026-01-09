import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nService } from './I18nService';
import { ConfigService } from './ConfigService';

// Mock ConfigService
vi.mock('./ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
  },
}));

describe('I18nService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default language', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({ language: 'zh-CN' } as any);
    await I18nService.init();
    expect(I18nService.getLanguage()).toBe('zh-CN');
  });

  it('should switch language correctly', () => {
    I18nService.setLanguage('en-US');
    expect(I18nService.getLanguage()).toBe('en-US');
    // We can't easily check the return value of t() without mocking the locale files or knowing their content.
    // But we can check if it returns a string.
    expect(typeof I18nService.t('app_name')).toBe('string');
    
    I18nService.setLanguage('zh-CN');
    expect(I18nService.getLanguage()).toBe('zh-CN');
    expect(typeof I18nService.t('app_name')).toBe('string');
  });

  it('should return key if translation missing', () => {
    // @ts-ignore - Testing runtime behavior with invalid key
    expect(I18nService.t('non_existent_key')).toBe('non_existent_key');
  });
});

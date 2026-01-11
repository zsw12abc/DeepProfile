import { describe, it, expect, vi } from 'vitest';

// Mock I18nService
vi.mock('../services/I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

// Mock chrome runtime
const mockSendMessage = vi.fn();
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  }
} as any;

// Mock MutationObserver
const mockMutationObserver = vi.fn(function() {
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  };
});

global.MutationObserver = mockMutationObserver;

describe('ZhihuComments', () => {
  it('should be defined', async () => {
    const ZhihuCommentsModule = await import('./zhihu-comments');
    expect(ZhihuCommentsModule.default).toBeDefined();
    expect(ZhihuCommentsModule.config).toBeDefined();
  });
});
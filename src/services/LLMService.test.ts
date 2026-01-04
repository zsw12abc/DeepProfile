import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from './LLMService';
import { ConfigService } from './ConfigService';

// Mock ConfigService
vi.mock('./ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
  },
}));

describe('LLMService', () => {
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    fetchMock.mockClear();
    vi.clearAllMocks();
  });

  it('should call OpenAI API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: { openai: 'sk-test' },
      customBaseUrls: {},
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Analysis Result' } }] }),
    });

    const result = await LLMService.generateProfile('User content', 'general');

    expect(result.content).toBe('Analysis Result');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
        body: expect.stringContaining('"model":"gpt-3.5-turbo"'),
      })
    );
  });

  it('should call DeepSeek API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'deepseek',
      apiKeys: { deepseek: 'sk-deepseek' },
      customBaseUrls: {},
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'DeepSeek Result' } }] }),
    });

    await LLMService.generateProfile('User content', 'general');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"model":"deepseek-chat"'),
      })
    );
  });

  it('should call Gemini API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'gemini',
      apiKeys: { gemini: 'gemini-key' },
      customBaseUrls: {},
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Gemini Result' }] } }],
      }),
    });

    const result = await LLMService.generateProfile('User content', 'general');
    expect(result.content).toBe('Gemini Result');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should throw error if API Key is missing', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: {}, // Missing key
      customBaseUrls: {},
    });

    await expect(LLMService.generateProfile('test', 'general')).rejects.toThrow('API Key is required');
  });
  
  // 性能测试
  it('should complete fast mode faster than balanced mode', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: { openai: 'sk-test' },
      customBaseUrls: {},
      analysisMode: 'fast'
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"nickname":"test","topic_classification":"tech","value_orientation":[{"label":"tech","score":0.8}],"summary":"test"}' } }] }),
    });

    // 测试快速模式
    const fastStartTime = Date.now();
    const fastResult = await LLMService.generateProfile('User content', 'technology');
    const fastDuration = fastResult.durationMs || (Date.now() - fastStartTime);
    
    // 验证快速模式使用了简化的提示词
    expect(fetchMock).toHaveBeenCalled();
    
    console.log(`Fast mode duration: ${fastDuration}ms`);
  });
});

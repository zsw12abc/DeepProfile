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
});

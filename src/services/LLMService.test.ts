import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';
import { LabelService } from './LabelService';
import { TopicService } from './TopicService';
import { I18nService } from './I18nService';
import { LLMService } from './LLMService';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Mock dependencies first
vi.mock('./ConfigService');
vi.mock('./I18nService');
vi.mock('./LabelService');
vi.mock('./TopicService');
vi.mock('@langchain/openai');
vi.mock('@langchain/google-genai');

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock I18nService
    vi.mocked(I18nService).t.mockImplementation((key: string) => key);
    vi.mocked(I18nService).getLanguage.mockReturnValue('zh-CN');

    // Mock LabelService
    const mockLabelServiceInstance = {
      refreshCategories: vi.fn(),
      getLabelsForCategory: vi.fn(() => 'Mock Labels'),
    };
    vi.mocked(LabelService.getInstance).mockReturnValue(mockLabelServiceInstance);

    // Mock TopicService
    vi.mocked(TopicService.getCategoryName).mockReturnValue('Mock Category');

    // Mock fetch for Ollama
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          nickname: 'Ollama User',
          summary: 'Ollama Summary',
          topic_classification: 'general',
          value_orientation: [],
          evidence: []
        }),
        prompt_eval_count: 10,
        eval_count: 20
      }),
    });
  });

  const mockConfig = (provider: string, apiKey: string, baseUrl?: string, model?: string) => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: provider,
      apiKeys: { [provider]: apiKey },
      customBaseUrls: { [provider]: baseUrl },
      customModelNames: { [provider]: model },
      analysisMode: 'balanced',
      platformAnalysisModes: {},
      enableDebug: false
    } as any);
  };

  it('should call OpenAI API correctly', async () => {
    mockConfig('openai', 'sk-test', 'http://mock-openai-url', 'gpt-3.5-turbo');
    const mockInvoke = vi.fn().mockResolvedValue({
      content: JSON.stringify({ nickname: 'OpenAI User' })
    });
    vi.mocked(ChatOpenAI).mockImplementation(() => ({ invoke: mockInvoke } as any));

    const result = await LLMService.generateProfile('User content', 'general');

    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      openAIApiKey: 'sk-test',
      configuration: { baseURL: 'http://mock-openai-url' },
      modelName: 'gpt-3.5-turbo'
    }));
    expect(mockInvoke).toHaveBeenCalled();
    expect(result.content.nickname).toBe('OpenAI User');
  });

  it('should call DeepSeek API correctly', async () => {
    mockConfig('deepseek', 'sk-deepseek', 'http://mock-deepseek-url', 'deepseek-chat');
    const mockInvoke = vi.fn().mockResolvedValue({
      content: JSON.stringify({ nickname: 'DeepSeek User' })
    });
    vi.mocked(ChatOpenAI).mockImplementation(() => ({ invoke: mockInvoke } as any));

    const result = await LLMService.generateProfile('User content', 'general');

    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      openAIApiKey: 'sk-deepseek',
      configuration: { baseURL: 'http://mock-deepseek-url' },
      modelName: 'deepseek-chat'
    }));
    expect(mockInvoke).toHaveBeenCalled();
    expect(result.content.nickname).toBe('DeepSeek User');
  });

  it('should call Gemini API correctly', async () => {
    mockConfig('gemini', 'gemini-key', undefined, 'gemini-pro');
    const mockInvoke = vi.fn().mockResolvedValue({
      content: JSON.stringify({ nickname: 'Gemini User' })
    });
    vi.mocked(ChatGoogleGenerativeAI).mockImplementation(() => ({ invoke: mockInvoke } as any));

    const result = await LLMService.generateProfile('User content', 'general');

    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'gemini-key',
      modelName: 'gemini-pro'
    }));
    expect(mockInvoke).toHaveBeenCalled();
    expect(result.content.nickname).toBe('Gemini User');
  });

  it('should call Ollama API correctly', async () => {
    mockConfig('ollama', '', 'http://localhost:11434', 'llama3');

    const result = await LLMService.generateProfile('User content', 'general');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', expect.any(Object));
    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody.model).toBe('llama3');
    expect(result.content.nickname).toBe('Ollama User');
  });

  it('should throw error for missing API Key when required', async () => {
    mockConfig('openai', '', 'https://api.openai.com/v1'); // No key, not localhost
    await expect(LLMService.generateProfile('test', 'general')).rejects.toThrow("API Key is required");
  });
});

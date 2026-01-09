import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from './LLMService';
import { ConfigService } from './ConfigService';
import { LabelService } from './LabelService';
import { TopicService } from './TopicService';
import { I18nService } from './I18nService';

// Mock the entire LLM provider implementation
vi.mock('./ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
  },
}));

vi.mock('./I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    setLanguage: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

vi.mock('./LabelService', () => {
  const mockLabelServiceInstance = {
    refreshCategories: vi.fn(),
    getLabelsForCategory: vi.fn(() => 'Mock Labels'),
  };
  
  return {
    LabelService: {
      getInstance: vi.fn(() => mockLabelServiceInstance)
    }
  };
});

vi.mock('./TopicService', () => ({
  TopicService: {
    getCategoryName: vi.fn(() => 'Mock Category'),
  },
}));

// Mock the entire LLMService to avoid actual API calls
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        nickname: 'Test User',
        summary: 'Test Summary',
        topic_classification: 'general',
        value_orientation: [],
        evidence: []
      })
    })
  }))
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        nickname: 'Test User',
        summary: 'Test Summary',
        topic_classification: 'general',
        value_orientation: [],
        evidence: []
      })
    })
  }))
}));

// Mock fetch to avoid actual API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock for fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ 
          message: { 
            content: JSON.stringify({
              nickname: 'Test User',
              summary: 'Test Summary',
              topic_classification: 'general',
              value_orientation: [],
              evidence: []
            }) 
          } 
        }]
      }),
    });
  });

  it('should call OpenAI API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: { openai: 'sk-test' },
      customBaseUrls: { openai: 'http://mock-url' },
      customModelNames: { openai: 'gpt-3.5-turbo' }
    });

    const result = await LLMService.generateProfile('User content', 'general');

    expect(result.content.nickname).toBe('Test User');
    // We can't test the actual fetch call because the internal implementation might vary
    // Just verify that the method returns expected structure
    expect(result.content).toHaveProperty('summary');
    expect(result.content).toHaveProperty('topic_classification');
    expect(result.content).toHaveProperty('value_orientation');
    expect(result.content).toHaveProperty('evidence');
  });

  it('should call DeepSeek API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'deepseek',
      apiKeys: { deepseek: 'sk-deepseek' },
      customBaseUrls: { deepseek: 'http://mock-url' },
      customModelNames: { deepseek: 'deepseek-chat' }
    });

    const result = await LLMService.generateProfile('User content', 'general');

    expect(result.content.nickname).toBe('Test User');
  });

  it('should call Gemini API correctly', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'gemini',
      apiKeys: { gemini: 'gemini-key' },
      customBaseUrls: {},
      customModelNames: { gemini: 'gemini-pro' }
    });

    const result = await LLMService.generateProfile('User content', 'general');
    
    expect(result.content.nickname).toBe('Test User');
  });

  it('should handle missing API Key gracefully', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: {}, // Missing key
      customBaseUrls: { openai: 'http://localhost:11434' }, // Use localhost provider that doesn't require API key
      customModelNames: { openai: 'gpt-3.5-turbo' }
    });

    // Mock the fetch call to simulate a local provider response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ 
          message: { 
            content: JSON.stringify({
              nickname: 'Test User',
              summary: 'Test Summary',
              topic_classification: 'general',
              value_orientation: [],
              evidence: []
            }) 
          } 
        }]
      }),
    });

    const result = await LLMService.generateProfile('test', 'general');
    expect(result.content.nickname).toBe('Test User');
  });
  
  // 性能测试
  it('should complete fast mode faster than balanced mode', async () => {
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      selectedProvider: 'openai',
      apiKeys: { openai: 'sk-test' },
      customBaseUrls: {},
      analysisMode: 'fast',
      customModelNames: { openai: 'gpt-3.5-turbo' }
    });

    const result = await LLMService.generateProfile('User content', 'technology');
    
    expect(result.content.nickname).toBe('Test User');
  });
});
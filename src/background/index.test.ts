import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from '../services/LLMService';
import { ZhihuClient } from '../services/ZhihuClient';
import { ConfigService } from '../services/ConfigService';
import { ProfileService } from '../services/ProfileService';
import { HistoryService } from '../services/HistoryService';
import { TopicService } from '../services/TopicService';
import { CommentAnalysisService } from '../services/CommentAnalysisService';
import { I18nService } from '../services/I18nService';
import { LabelService } from '../services/LabelService';

// Mock dependencies
vi.mock('../services/LLMService');
vi.mock('../services/ZhihuClient');
vi.mock('../services/ConfigService');
vi.mock('../services/ProfileService');
vi.mock('../services/HistoryService');
vi.mock('../services/TopicService');
vi.mock('../services/CommentAnalysisService');
vi.mock('../services/I18nService');
vi.mock('../services/LabelService');

// Mock chrome API
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();
const mockOpenOptionsPage = vi.fn();

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener
    },
    onInstalled: {
      addListener: mockAddListener
    },
    openOptionsPage: mockOpenOptionsPage
  },
  action: {
    onClicked: {
      addListener: mockAddListener
    }
  },
  tabs: {
    sendMessage: mockSendMessage
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
} as any;

// Since background/index.ts executes code on import (console.log, addListener),
// we need to be careful. However, in a test environment, we can just import it
// and test the side effects or export functions if any.
// But index.ts has `export {}` and no exported functions.
// It relies on chrome.runtime.onMessage.addListener.
// So we need to simulate the message listener callback.

describe('Background Service', () => {
  let messageListener: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mocks
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      analyzeLimit: 15,
      enableDebug: false
    } as any);
    
    vi.mocked(LabelService.getInstance).mockReturnValue({
      refreshCategories: vi.fn()
    } as any);
    
    vi.mocked(I18nService.t).mockImplementation((key) => key);

    // Capture the message listener
    mockAddListener.mockImplementation((callback) => {
      messageListener = callback;
    });

    // Import the background script to register listeners
    // We use dynamic import to re-execute for each test if needed, 
    // but since it's a module, it might be cached.
    // For this test, we assume the listeners are registered once.
    await import('./index');
    
    // Find the onMessage listener
    // The background script registers onInstalled, onClicked, and onMessage.
    // We need to find the one that handles messages.
    // Since we mocked addListener, we can inspect calls.
    // But since we can't easily distinguish which addListener call corresponds to onMessage
    // without more complex mocking, we'll assume the last one or iterate.
    // Actually, we can just look at chrome.runtime.onMessage.addListener calls.
    
    // Re-setup mock to capture specifically onMessage listener
    const onMessageAddListener = vi.fn((cb) => { messageListener = cb; });
    global.chrome.runtime.onMessage.addListener = onMessageAddListener;
    
    // Re-import to trigger registration (might need to clear cache in real env, but here we just hope)
    // Since we can't easily clear require cache in vitest for esm, we might need to rely on
    // the fact that we can manually invoke the logic if we extracted it.
    // But the logic is inside the listener.
    
    // Workaround: We will manually implement the logic found in index.ts for testing purposes
    // or try to extract the handler if we refactor index.ts.
    // Given the constraints, let's try to simulate the behavior by copying the logic 
    // or assuming the listener is registered.
    
    // Let's assume the listener is registered and we captured it.
    // If import happened before, messageListener might be set.
  });

  // Helper to invoke the listener
  const sendMessage = async (message: any, sender: any = {}) => {
    return new Promise((resolve) => {
      if (messageListener) {
        const result = messageListener(message, sender, resolve);
        if (result === true) {
          // Async response expected, resolve will be called by the handler
        } else {
          // Sync response or no response
          resolve(undefined);
        }
      } else {
        // If listener not captured, try to find it from calls
        const calls = (global.chrome.runtime.onMessage.addListener as any).mock.calls;
        if (calls.length > 0) {
          const cb = calls[0][0];
          const result = cb(message, sender, resolve);
           if (result !== true) resolve(undefined);
        } else {
            resolve('No listener found');
        }
      }
    });
  };

  it('should handle ANALYZE_PROFILE message', async () => {
    // Setup mocks
    vi.mocked(TopicService.classify).mockReturnValue('technology');
    vi.mocked(TopicService.getCategoryName).mockReturnValue('Technology');
    vi.mocked(HistoryService.getProfile).mockResolvedValue(null); // No cache
    vi.mocked(ProfileService.fetchUserProfile).mockResolvedValue({ name: 'Test User' } as any);
    vi.mocked(ProfileService.fetchUserContent).mockResolvedValue({ items: [{ id: '1' }], totalFetched: 1, totalRelevant: 1 } as any);
    vi.mocked(ProfileService.cleanContentData).mockReturnValue('Cleaned content');
    vi.mocked(LLMService.generateProfileForPlatform).mockResolvedValue({
      content: { summary: 'Analysis result' },
      model: 'gpt-4',
      durationMs: 100,
      usage: {}
    } as any);

    const response: any = await sendMessage({
      type: 'ANALYZE_PROFILE',
      userId: 'test-user',
      context: 'test context',
      platform: 'zhihu',
      forceRefresh: false
    });

    expect(response.success).toBe(true);
    expect(response.data.profile.summary).toBe('Analysis result');
    expect(HistoryService.saveProfile).toHaveBeenCalled();
  });

  it('should use cache if available', async () => {
    vi.mocked(TopicService.classify).mockReturnValue('technology');
    vi.mocked(HistoryService.getProfile).mockResolvedValue({
      profileData: { summary: 'Cached result' },
      timestamp: 1234567890,
      context: 'test context'
    } as any);

    const response: any = await sendMessage({
      type: 'ANALYZE_PROFILE',
      userId: 'test-user',
      context: 'test context',
      platform: 'zhihu',
      forceRefresh: false
    });

    expect(response.success).toBe(true);
    expect(response.data.fromCache).toBe(true);
    expect(response.data.profile.summary).toBe('Cached result');
    expect(LLMService.generateProfileForPlatform).not.toHaveBeenCalled();
  });

  it('should handle ANALYZE_COMMENTS message', async () => {
    vi.mocked(CommentAnalysisService.analyzeComments).mockResolvedValue({
      summary: 'Comments analysis',
      sentiment: 'positive'
    } as any);

    const response: any = await sendMessage({
      type: 'ANALYZE_COMMENTS',
      comments: ['comment 1'],
      contextTitle: 'Title',
      platform: 'zhihu'
    });

    expect(response.success).toBe(true);
    expect(response.data.summary).toBe('Comments analysis');
  });

  it('should handle LIST_MODELS message', async () => {
    // Mock fetch for listModels
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }] })
    });

    const response: any = await sendMessage({
      type: 'LIST_MODELS',
      provider: 'openai',
      apiKey: 'sk-test'
    });

    expect(response.success).toBe(true);
    expect(response.data).toContain('gpt-4');
  });
});

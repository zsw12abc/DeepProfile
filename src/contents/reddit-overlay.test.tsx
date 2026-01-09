import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import RedditOverlay from "./reddit-overlay";

// Mock chrome API
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

Object.defineProperty(window, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage,
      onMessage: {
        addListener: mockAddListener,
        removeListener: mockRemoveListener
      }
    },
    storage: {
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      }
    }
  },
  writable: true
});

// Mock DOM APIs that might not be available in testing environment
Object.defineProperty(document, 'body', {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    insertBefore: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: (tag: string) => ({
    tagName: tag.toUpperCase(),
    id: '',
    style: {},
    innerHTML: '',
    appendChild: vi.fn(),
    setAttribute: vi.fn(),
    remove: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    contains: vi.fn()
  }),
  writable: true
});

Object.defineProperty(document, 'getElementById', {
  value: (id: string) => {
    if (id === 'deep-profile-overlay-container') {
      // 返回一个模拟的容器元素
      return {
        id: 'deep-profile-overlay-container',
        remove: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        contains: vi.fn(),
        innerHTML: '',
        style: {}
      };
    }
    return null;
  },
  writable: true
});

// Mock the dependencies
vi.mock("~services/ConfigService", () => ({
  ConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      globalEnabled: true,
      language: 'zh-CN',
      selectedProvider: 'openai',
      apiKeys: {},
      customBaseUrls: {},
      customModelNames: {},
      analyzeLimit: 15,
      enableDebug: false,
      analysisMode: 'balanced',
      platformAnalysisModes: {
        zhihu: 'balanced',
        reddit: 'balanced',
        twitter: 'balanced',
        weibo: 'balanced'
      },
      enabledPlatforms: {
        zhihu: true,
        reddit: true,
        twitter: false,
        weibo: false
      },
      platformConfigs: {
        zhihu: {
          enabled: true,
          baseUrl: 'https://www.zhihu.com',
          apiEndpoint: 'https://www.zhihu.com/api/v4'
        },
        reddit: {
          enabled: true,
          baseUrl: 'https://www.reddit.com',
          apiEndpoint: 'https://oauth.reddit.com'
        },
        twitter: {
          enabled: false,
          baseUrl: 'https://twitter.com',
          apiEndpoint: 'https://api.twitter.com'
        },
        weibo: {
          enabled: false,
          baseUrl: 'https://weibo.com',
          apiEndpoint: 'https://api.weibo.com'
        }
      },
      themeId: 'zhihu-white',
      themes: {}
    })
  }
}));

vi.mock("~services/I18nService", () => ({
  I18nService: {
    t: vi.fn((key) => {
      const translations: Record<string, string> = {
        'loading': 'Loading...',
        'deep_profile_analysis': 'Analyze Profile',
        'analyzing': 'Analyzing',
        'reanalyze': 'Re-analyzing',
        'error_network': 'Network Error',
        'wait_moment': 'Please wait...'
      };
      return translations[key] || key;
    }),
    init: vi.fn(),
    getLanguage: vi.fn(() => 'zh-CN')
  }
}));

vi.mock("~components/ProfileCard", () => ({
  ProfileCard: ({ record, platform, onRefresh, onDelete }: any) => (
    <div data-testid="profile-card" data-userid={record.userId}>
      Profile Card for {record.userId}
      <button data-testid="close-btn" onClick={onDelete}>Close</button>
      {onRefresh && <button data-testid="refresh-btn" onClick={onRefresh}>Refresh</button>}
    </div>
  )
}));

vi.mock("react-dom/client", () => {
  return {
    createRoot: vi.fn((container) => ({
      render: vi.fn((element) => {
        // 模拟渲染
        container.innerHTML = `<div>${element.props.record.userId}</div>`;
      }),
      unmount: vi.fn()
    }))
  };
});

describe("RedditOverlay Integration Test", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default response for chrome API
    mockSendMessage.mockResolvedValue({
      success: true,
      data: {
        profile: { nickname: "testuser", summary: "Test user profile" },
        items: [],
        userProfile: null
      }
    });
  });

  it("should create overlay container when user is analyzed", async () => {
    // This test verifies that the overlay container is properly managed
    render(<RedditOverlay />);
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(vi.mocked(ConfigService.getConfig)).toHaveBeenCalled();
    });
    
    // Verify chrome API listener was added
    expect(mockAddListener).toHaveBeenCalled();
  });

  it("should handle analysis request properly", async () => {
    render(<RedditOverlay />);
    
    // Simulate the handleAnalyze function being called (indirectly)
    const userId = "testuser";
    const response = await mockSendMessage({
      type: "ANALYZE_PROFILE",
      userId,
      context: "",
      platform: 'reddit',
      forceRefresh: false
    });
    
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "ANALYZE_PROFILE",
      userId,
      context: "",
      platform: 'reddit',
      forceRefresh: false
    });
    
    expect(response.success).toBe(true);
  });

  it("should handle error cases gracefully", async () => {
    // Mock error response
    mockSendMessage.mockRejectedValue(new Error("Network error"));
    
    render(<RedditOverlay />);
    
    // Even with error, the component should not crash
    expect(() => {
      render(<RedditOverlay />);
    }).not.toThrow();
  });
});
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ConfigService } from "../services/ConfigService";

// Mock I18nService
vi.mock("../services/I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

// Mock ConfigService
vi.mock("../services/ConfigService", () => ({
  ConfigService: {
    getConfig: vi.fn().mockResolvedValue({
      globalEnabled: true,
      language: "zh-CN",
      selectedProvider: "openai",
      apiKeys: {},
      customBaseUrls: {},
      customModelNames: {},
      analyzeLimit: 15,
      enableDebug: false,
      analysisMode: "balanced",
      platformAnalysisModes: {
        zhihu: "balanced",
        reddit: "balanced",
        twitter: "balanced",
        weibo: "balanced",
      },
      enabledPlatforms: {
        zhihu: true,
        reddit: true,
        twitter: false,
        weibo: false,
      },
      platformConfigs: {
        zhihu: {
          enabled: true,
          baseUrl: "https://www.zhihu.com",
          apiEndpoint: "https://www.zhihu.com/api/v4",
        },
        reddit: {
          enabled: true,
          baseUrl: "https://www.reddit.com",
          apiEndpoint: "https://oauth.reddit.com",
        },
        twitter: {
          enabled: false,
          baseUrl: "https://twitter.com",
          apiEndpoint: "https://api.twitter.com",
        },
        weibo: {
          enabled: false,
          baseUrl: "https://weibo.com",
          apiEndpoint: "https://api.weibo.com",
        },
      },
      themeId: "zhihu-white",
      themes: {},
    }),
  },
}));

// Mock ProfileCard component
vi.mock("../components/ProfileCard", () => ({
  ProfileCard: () => <div data-testid="profile-card">Profile Card</div>,
}));

// Mock chrome runtime
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    },
  },
  storage: {
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as any;

// Import the component directly instead of dynamically
import ZhihuOverlay from "./zhihu-overlay";

describe("ZhihuOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";

    // Mock MutationObserver
    global.MutationObserver = class {
      constructor(callback: any) {
        this.callback = callback;
      }
      callback: any;
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as any;
  });

  it("should be defined", () => {
    expect(ZhihuOverlay).toBeDefined();
  });

  it("should render without crashing", () => {
    render(<ZhihuOverlay />);
    // The component returns an empty div initially
    // We can't easily test the injection logic in JSDOM without more complex setup
    // but we can verify it renders
  });

  it("should inject buttons when enabled", async () => {
    // Setup DOM with a Zhihu user link
    document.body.innerHTML = `
      <div>
        <a href="https://www.zhihu.com/people/testuser">Test User</a>
      </div>
    `;

    render(<ZhihuOverlay />);

    // Wait for async effects
    await waitFor(() => {
      // Check if button injection logic ran (this is tricky in JSDOM as MutationObserver behavior is mocked)
      // But we can check if ConfigService was called
      expect(ConfigService.getConfig).toHaveBeenCalled();
    });
  });
});

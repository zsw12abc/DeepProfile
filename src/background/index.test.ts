import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMService } from "../services/LLMService";
import { ZhihuClient } from "../services/ZhihuClient";
import { ConfigService } from "../services/ConfigService";
import { ProfileService } from "../services/ProfileService";
import { HistoryService } from "../services/HistoryService";
import { TopicService } from "../services/TopicService";
import { CommentAnalysisService } from "../services/CommentAnalysisService";
import { I18nService } from "../services/I18nService";
import { LabelService } from "../services/LabelService";
import { TelemetryService } from "../services/TelemetryService";
import { ReplyAssistantService } from "../services/ReplyAssistantService";

// Mock dependencies
vi.mock("../services/LLMService");
vi.mock("../services/ZhihuClient");
vi.mock("../services/ConfigService");
vi.mock("../services/ProfileService");
vi.mock("../services/HistoryService");
vi.mock("../services/TopicService");
vi.mock("../services/CommentAnalysisService");
vi.mock("../services/I18nService");
vi.mock("../services/LabelService");
vi.mock("../services/TelemetryService");
vi.mock("../services/ReplyAssistantService");

// Mock chrome API
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();
const mockOpenOptionsPage = vi.fn();
const mockGetManifest = vi.fn();

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    },
    onInstalled: {
      addListener: mockAddListener,
    },
    openOptionsPage: mockOpenOptionsPage,
    getManifest: mockGetManifest,
  },
  action: {
    onClicked: {
      addListener: mockAddListener,
    },
  },
  tabs: {
    sendMessage: mockSendMessage,
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
} as any;

// Mock the actual background service logic to test the message handlers
// Since background/index.ts executes code on import (console.log, addListener),
// we need to be careful. However, in a test environment, we can just import it
// and test the side effects or export functions if any.
// But index.ts has `export {}` and no exported functions.
// It relies on chrome.runtime.onMessage.addListener.
// So we need to simulate the message listener callback.

describe("Background Service", () => {
  let messageListener:
    | ((message: any, sender: any, sendResponse: (v: any) => void) => any)
    | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mocks
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      analyzeLimit: 15,
      enableDebug: false,
    } as any);

    vi.mocked(LabelService.getInstance).mockReturnValue({
      refreshCategories: vi.fn(),
    } as any);

    vi.mocked(I18nService.t).mockImplementation((key) => key);
    vi.mocked(I18nService.init).mockResolvedValue(undefined);
    vi.mocked(TelemetryService.recordEvent).mockResolvedValue(undefined);
    vi.mocked(TelemetryService.recordError).mockResolvedValue(undefined);
    vi.mocked(TelemetryService.recordPerformance).mockResolvedValue(undefined);
    vi.mocked(TelemetryService.recordCompliance).mockResolvedValue(undefined);

    // Capture the message listener
    mockAddListener.mockImplementation((callback) => {
      messageListener = callback;
    });

    // Import the background script to register listeners
    // We use dynamic import to re-execute for each test if needed,
    // but since it's a module, it might be cached.
    // For this test, we assume the listeners are registered once.
    await import("./index");

    // Find the onMessage listener
    // The background script registers onInstalled, onClicked, and onMessage.
    // We need to find the one that handles messages.
    // Since we mocked addListener, we can inspect calls.
    // But since we can't easily distinguish which addListener call corresponds to onMessage
    // without more complex mocking, we'll assume the last one or iterate.
    // Actually, we can just look at chrome.runtime.onMessage.addListener calls.

    // Re-setup mock to capture specifically onMessage listener
    const onMessageAddListener = vi.fn((cb) => {
      messageListener = cb;
    });
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
        // If listener not cached, try to find it from calls
        const calls = (global.chrome.runtime.onMessage.addListener as any).mock
          .calls;
        if (calls.length > 0) {
          const cb = calls[0][0];
          const result = cb(message, sender, resolve);
          if (result !== true) resolve(undefined);
        } else {
          resolve("No listener found");
        }
      }
    });
  };

  it("should handle ANALYZE_PROFILE message", async () => {
    // Setup mocks
    vi.mocked(TopicService.classify).mockReturnValue("technology");
    vi.mocked(TopicService.getCategoryName).mockReturnValue("Technology");
    vi.mocked(HistoryService.getProfile).mockResolvedValue(null); // No cache
    vi.mocked(ProfileService.fetchUserProfile).mockResolvedValue({
      name: "Test User",
      headline: "Test Headline",
      avatar_url: "http://example.com/avatar.jpg",
      url_token: "test-user",
    } as any);
    vi.mocked(ProfileService.fetchUserContent).mockResolvedValue({
      items: [{ id: "1" }],
      totalFetched: 1,
      totalRelevant: 1,
    } as any);
    vi.mocked(ProfileService.cleanContentData).mockReturnValue(
      "Cleaned content",
    );
    vi.mocked(LLMService.generateProfileForPlatform).mockResolvedValue({
      content: { summary: "Analysis result" },
      model: "gpt-4",
      durationMs: 100,
      usage: {},
    } as any);

    const response: any = await sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "test-user",
      context: "test context",
      platform: "zhihu",
      forceRefresh: false,
    });

    expect(response.success).toBe(true);
    expect(response.data.profile.summary).toBe("Analysis result");
    expect(HistoryService.saveProfile).toHaveBeenCalled();
  });

  it("should use cache if available", async () => {
    vi.mocked(TopicService.classify).mockReturnValue("technology");
    vi.mocked(HistoryService.getProfile).mockResolvedValue({
      profileData: { summary: "Cached result" },
      timestamp: 1234567890,
      context: "test context",
    } as any);

    const response: any = await sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "test-user",
      context: "test context",
      platform: "zhihu",
      forceRefresh: false,
    });

    expect(response.success).toBe(true);
    expect(response.data.fromCache).toBe(true);
    expect(response.data.profile.summary).toBe("Cached result");
    expect(LLMService.generateProfileForPlatform).not.toHaveBeenCalled();
  });

  it("should handle ANALYZE_COMMENTS message", async () => {
    vi.mocked(CommentAnalysisService.analyzeComments).mockResolvedValue({
      summary: "Comments analysis",
      sentiment: "positive",
    } as any);

    const response: any = await sendMessage({
      type: "ANALYZE_COMMENTS",
      comments: ["comment 1"],
      contextTitle: "Title",
      platform: "zhihu",
    });

    expect(response.success).toBe(true);
    expect(response.data.summary).toBe("Comments analysis");
  });

  it("should handle LIST_MODELS message", async () => {
    // Mock fetch for listModels
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "gpt-4" }, { id: "gpt-3.5-turbo" }] }),
    });

    const response: any = await sendMessage({
      type: "LIST_MODELS",
      provider: "openai",
      apiKey: "sk-test",
    });

    expect(response.success).toBe(true);
    expect(response.data).toContain("gpt-4");
  });

  it("should handle GENERATE_REPLY message", async () => {
    vi.mocked(ReplyAssistantService.generateReply).mockResolvedValue({
      reply: "This is a reply",
      wasTrimmed: false,
      limit: 100,
      countMethod: "chars",
      originalCount: 15,
      finalCount: 15,
    } as any);

    const response: any = await sendMessage({
      type: "GENERATE_REPLY",
      platform: "zhihu",
      tone: "friendly",
      context: "context",
      replyLength: "medium",
    });

    expect(response.success).toBe(true);
    expect(response.data.reply).toBe("This is a reply");
    expect(TelemetryService.recordEvent).toHaveBeenCalledWith("reply_generation_requested", expect.any(Object));
    expect(TelemetryService.recordPerformance).toHaveBeenCalledWith("reply_generation_completed", expect.any(Object));
  });

  it("should handle TEST_CONNECTION message for openai", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    });

    const response: any = await sendMessage({
      type: "TEST_CONNECTION",
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4",
    });

    expect(response.success).toBe(true);
    expect(response.data).toBe("connection_success");
  });

  it("should handle TEST_CONNECTION error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const response: any = await sendMessage({
      type: "TEST_CONNECTION",
      provider: "openai",
      apiKey: "sk-invalid",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("error_401");
  });

  it("should handle LIST_MODELS message for gemini", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "models/gemini-pro", supportedGenerationMethods: ["generateContent"] }] }),
    });

    const response: any = await sendMessage({
      type: "LIST_MODELS",
      provider: "gemini",
      apiKey: "test",
    });

    expect(response.success).toBe(true);
    expect(response.data).toContain("gemini-pro");
  });

  it("should handle LIST_MODELS message for ollama", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "llama3" }] }),
    });

    const response: any = await sendMessage({
      type: "LIST_MODELS",
      provider: "ollama",
    });

    expect(response.success).toBe(true);
    expect(response.data).toContain("llama3");
  });

  it("should handle ANALYZE_PROFILE caching and force refresh", async () => {
    vi.mocked(TopicService.classify).mockReturnValue("general");
    vi.mocked(TopicService.classifyWithLLM).mockResolvedValue("technology");

    vi.mocked(HistoryService.getProfile).mockResolvedValue({
      profileData: { summary: "Cached result" },
      timestamp: 1234,
      context: "test",
    } as any);

    await sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "test-user",
      platform: "zhihu",
      forceRefresh: true, // Should bypass cache
    });

    // It will fail because ProfileService mocked return values are empty arrays from beforeEach or previous test if not reassigned, but actually we just want to ensure HistoryService.getProfile is handled correctly.
    // Let's setup the mocks so it succeeds
    vi.mocked(ProfileService.fetchUserProfile).mockResolvedValue({ name: "A" } as any);
    vi.mocked(ProfileService.fetchUserContent).mockResolvedValue({ items: [{ id: "1" }], totalFetched: 1, totalRelevant: 1 } as any);
    vi.mocked(LLMService.generateProfileForPlatform).mockResolvedValue({ content: "New Result" } as any);

    const forceResponse: any = await sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "test-user",
      platform: "zhihu",
      forceRefresh: true,
    });

    expect(forceResponse.success).toBe(true);
    expect(forceResponse.data.fromCache).toBe(false);
  });

  it("should handle ANALYZE_PROFILE failure when no items and no userProfile", async () => {
    vi.mocked(ProfileService.fetchUserProfile).mockResolvedValue(null);
    vi.mocked(ProfileService.fetchUserContent).mockResolvedValue({ items: [] } as any);

    const response: any = await sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "no-exist-user",
      platform: "zhihu",
      forceRefresh: true,
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("error_user_not_found");
  });

  it("should handle TELEMETRY_EVENT", async () => {
    const response: any = await sendMessage({ type: "TELEMETRY_EVENT", name: "test", data: {} });
    expect(response.success).toBe(true);
    expect(TelemetryService.recordEvent).toHaveBeenCalledWith("test", {});
  });

  it("should handle TELEMETRY_ERROR", async () => {
    const response: any = await sendMessage({ type: "TELEMETRY_ERROR", name: "test", data: {} });
    expect(response.success).toBe(true);
    expect(TelemetryService.recordError).toHaveBeenCalledWith("test", {});
  });

  it("should handle TELEMETRY_PERFORMANCE", async () => {
    const response: any = await sendMessage({ type: "TELEMETRY_PERFORMANCE", name: "test", data: {} });
    expect(response.success).toBe(true);
    expect(TelemetryService.recordPerformance).toHaveBeenCalledWith("test", {});
  });

  it("should handle TELEMETRY_COMPLIANCE", async () => {
    const response: any = await sendMessage({ type: "TELEMETRY_COMPLIANCE", name: "test", data: {} });
    expect(response.success).toBe(true);
    expect(TelemetryService.recordCompliance).toHaveBeenCalledWith("test", {});
  });

  describe("Error and Edge Cases", () => {
    it("should handle error in ANALYZE_PROFILE", async () => {
      // Force handleAnalysis to throw an error from inside its try block
      vi.mocked(ProfileService.fetchUserProfile).mockImplementation(() => {
        throw new Error("Simulated Error 401");
      });

      const response: any = await sendMessage({
        type: "ANALYZE_PROFILE",
        userId: "test-user",
        platform: "zhihu",
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("error_401");
      expect(TelemetryService.recordError).toHaveBeenCalledWith("analysis_failed", expect.any(Object));
    });

    it("should handle ANALYZE_COMMENTS with answerId fallback", async () => {
      vi.mocked(ZhihuClient.fetchAnswerContentForContext).mockResolvedValue("Fetched Answer Content");
      vi.mocked(CommentAnalysisService.analyzeComments).mockResolvedValue({} as any);

      const response: any = await sendMessage({
        type: "ANALYZE_COMMENTS",
        comments: [],
        answerId: "12345",
        platform: "zhihu",
      });

      expect(response.success).toBe(true);
      expect(ZhihuClient.fetchAnswerContentForContext).toHaveBeenCalledWith("12345");
      expect(CommentAnalysisService.analyzeComments).toHaveBeenCalledWith(
        [],
        undefined,
        "Fetched Answer Content",
        "zhihu"
      );
    });

    it("should handle error in ANALYZE_COMMENTS", async () => {
      vi.mocked(CommentAnalysisService.analyzeComments).mockRejectedValue(new Error("Analysis failed"));

      const response: any = await sendMessage({
        type: "ANALYZE_COMMENTS",
        comments: [],
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("Analysis failed");
    });

    it("should handle error in GENERATE_REPLY", async () => {
      vi.mocked(ReplyAssistantService.generateReply).mockRejectedValue(new Error("Reply failed"));

      const response: any = await sendMessage({
        type: "GENERATE_REPLY",
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("Reply failed");
      expect(TelemetryService.recordError).toHaveBeenCalledWith("reply_generation_failed", expect.any(Object));
    });

    it("should handle TEST_CONNECTION message for ollama and gemini", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      let response: any = await sendMessage({
        type: "TEST_CONNECTION",
        provider: "ollama",
        baseUrl: "http://localhost",
      });
      expect(response.success).toBe(true);

      response = await sendMessage({
        type: "TEST_CONNECTION",
        provider: "gemini",
        apiKey: "api-key",
      });
      expect(response.success).toBe(true);
    });

    it("should handle LIST_MODELS fallback for qwen", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "dashscope error",
      });

      const response: any = await sendMessage({
        type: "LIST_MODELS",
        provider: "qwen",
      });

      expect(response.success).toBe(true);
      expect(response.data).toContain("qwen-turbo"); // Checks the fallback models are returned
    });

    it("should handle ANALYZE_PROFILE with config debug true", async () => {
      vi.mocked(ConfigService.getConfig).mockResolvedValue({
        analyzeLimit: 15,
        enableDebug: true,
      } as any);
      vi.mocked(TopicService.classify).mockReturnValue("technology");
      vi.mocked(HistoryService.getProfile).mockResolvedValue(null);
      vi.mocked(ProfileService.fetchUserProfile).mockResolvedValue({ name: "A" } as any);
      vi.mocked(ProfileService.fetchUserContent).mockResolvedValue({
        items: [{ id: "1", action_type: "created" }, { id: "2", action_type: "voted" }],
        totalFetched: 2,
        totalRelevant: 2,
      } as any);
      vi.mocked(LLMService.generateProfileForPlatform).mockResolvedValue({
        content: { summary: "R" },
        model: "gpt-4",
        durationMs: 100,
        usage: { prompt_tokens: 10 },
      } as any);

      const response: any = await sendMessage({
        type: "ANALYZE_PROFILE",
        userId: "test-user",
        context: "Context|Tag1",
        platform: "zhihu",
        forceRefresh: true,
      });

      expect(response.success).toBe(true);
      expect(response.data.debugInfo).toBeDefined();
      expect(response.data.debugInfo.itemsBreakdown).toContain("Created: 1, Voted: 1");
      expect(response.data.debugInfo.sourceInfo).toContain("Top 2 of 2");
    });
  });
});


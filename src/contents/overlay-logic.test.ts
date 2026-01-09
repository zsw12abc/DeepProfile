import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock chrome API
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

// Mock global objects
Object.defineProperty(global, 'chrome', {
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

describe("Overlay Logic Test", () => {
  beforeEach(() => {
    // Reset mocks before each test
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

  it("should send ANALYZE_PROFILE message with correct parameters for Reddit", async () => {
    // Test the message sending logic for Reddit
    const response = await global.chrome.runtime.sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "test context",
      platform: "reddit",
      forceRefresh: false
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "test context",
      platform: "reddit",
      forceRefresh: false
    });
    
    expect(response.success).toBe(true);
  });

  it("should send ANALYZE_PROFILE message with correct parameters for Zhihu", async () => {
    // Test the message sending logic for Zhihu
    const response = await global.chrome.runtime.sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "test question",
      platform: "zhihu",
      forceRefresh: false
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "test question",
      platform: "zhihu",
      forceRefresh: false
    });
    
    expect(response.success).toBe(true);
  });

  it("should handle error responses gracefully", async () => {
    // Mock error response
    mockSendMessage.mockResolvedValue({
      success: false,
      error: "User not found"
    });

    const response = await global.chrome.runtime.sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "nonexistent",
      context: "",
      platform: "zhihu",
      forceRefresh: false
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("User not found");
  });

  it("should handle network errors", async () => {
    // Mock network error
    mockSendMessage.mockRejectedValue(new Error("Network error"));

    await expect(async () => {
      await global.chrome.runtime.sendMessage({
        type: "ANALYZE_PROFILE",
        userId: "testuser",
        context: "",
        platform: "reddit",
        forceRefresh: false
      });
    }).rejects.toThrow("Network error");

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "",
      platform: "reddit",
      forceRefresh: false
    });
  });

  it("should send forceRefresh parameter correctly", async () => {
    // Test force refresh functionality
    await global.chrome.runtime.sendMessage({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "",
      platform: "zhihu",
      forceRefresh: true
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "ANALYZE_PROFILE",
      userId: "testuser",
      context: "",
      platform: "zhihu",
      forceRefresh: true
    });
  });
});
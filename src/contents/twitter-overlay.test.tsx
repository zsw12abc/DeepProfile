import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ConfigService } from "../services/ConfigService";

const {
  mockGetConfig,
  mockSendMessage,
  mockRuntimeAddListener,
  mockRuntimeRemoveListener,
  mockStorageAddListener,
  mockStorageRemoveListener,
} = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockSendMessage: vi.fn(),
  mockRuntimeAddListener: vi.fn(),
  mockRuntimeRemoveListener: vi.fn(),
  mockStorageAddListener: vi.fn(),
  mockStorageRemoveListener: vi.fn(),
}));

vi.mock("../services/I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

vi.mock("../services/ConfigService", () => ({
  ConfigService: {
    getConfig: mockGetConfig,
  },
}));

vi.mock("../components/ProfileCard", () => ({
  ProfileCard: () => <div data-testid="profile-card">Profile Card</div>,
}));

vi.mock("./injection-utils", () => ({
  createInjectionScheduler: ({ injectButtons }: { injectButtons: (root?: ParentNode) => void }) => ({
    start: (root: ParentNode) => injectButtons(root),
    stop: vi.fn(),
    schedule: vi.fn(),
  }),
}));

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockRuntimeAddListener,
      removeListener: mockRuntimeRemoveListener,
    },
  },
  storage: {
    onChanged: {
      addListener: mockStorageAddListener,
      removeListener: mockStorageRemoveListener,
    },
  },
} as any;

import TwitterOverlay from "./twitter-overlay";

describe("TwitterOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetConfig.mockResolvedValue({
      globalEnabled: true,
      platformConfigs: {
        twitter: {
          analysisButtonEnabled: true,
        },
      },
    });

    mockSendMessage.mockResolvedValue({ success: true });

    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="https://x.com/testuser">Test User</a>
        </div>
        <div data-testid="tweetText">This is a tweet about AI safety.</div>
      </article>
      <a href="/hashtag/AI">#AI</a>
    `;
  });

  it("should be defined", () => {
    expect(TwitterOverlay).toBeDefined();
  });

  it("should read config and register listeners", async () => {
    render(<TwitterOverlay />);

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalled();
      expect(mockRuntimeAddListener).toHaveBeenCalled();
      expect(mockStorageAddListener).toHaveBeenCalled();
    });

    expect(mockRuntimeAddListener).toHaveBeenCalledTimes(2);
  });

  it("handles TWITTER_CONTENT_REQUEST and responds with scraped content", async () => {
    render(<TwitterOverlay />);

    await waitFor(() => {
      expect(mockRuntimeAddListener).toHaveBeenCalledTimes(2);
    });

    const requestHandler = mockRuntimeAddListener.mock.calls[1][0];

    await requestHandler(
      {
        type: "TWITTER_CONTENT_REQUEST",
        requestId: "req-1",
        username: "testuser",
        limit: 1,
        url: "https://x.com/testuser",
      },
      {},
      vi.fn(),
    );

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "TWITTER_CONTENT_RESPONSE",
          requestId: "req-1",
          content: expect.any(Array),
        }),
      );
    });
  });

  it("does not inject button when feature is disabled", async () => {
    mockGetConfig.mockResolvedValueOnce({
      globalEnabled: false,
      platformConfigs: {
        twitter: {
          analysisButtonEnabled: true,
        },
      },
    });

    render(<TwitterOverlay />);

    await waitFor(() => {
      expect(document.querySelector(".deep-profile-btn")).toBeNull();
    });
  });
});

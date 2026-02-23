import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
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
  createInjectionScheduler: ({
    injectButtons,
  }: {
    injectButtons: (root?: ParentNode) => void;
  }) => ({
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

import RedditOverlay from "./reddit-overlay";

describe("RedditOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetConfig.mockResolvedValue({
      globalEnabled: true,
      platformConfigs: {
        reddit: {
          analysisButtonEnabled: true,
        },
      },
    });

    mockSendMessage.mockResolvedValue({
      success: true,
      data: {
        profile: { nickname: "testuser", summary: "summary" },
        items: [],
        userProfile: null,
      },
    });

    document.body.innerHTML = `
      <h1 data-test-id="post-title">Sample Post Title</h1>
      <a data-click-id="subreddit" href="/r/test">r/test</a>
      <div>
        <a href="https://www.reddit.com/user/testuser">testuser</a>
      </div>
    `;
  });

  it("should be defined", () => {
    expect(RedditOverlay).toBeDefined();
  });

  it("should read config and register listeners", async () => {
    const { unmount } = render(<RedditOverlay />);

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalled();
      expect(mockRuntimeAddListener).toHaveBeenCalled();
      expect(mockStorageAddListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockRuntimeRemoveListener).toHaveBeenCalled();
    expect(mockStorageRemoveListener).toHaveBeenCalled();
  });

  it("re-checks config when storage deep_profile_config changes", async () => {
    render(<RedditOverlay />);

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalledTimes(1);
      expect(mockStorageAddListener).toHaveBeenCalledTimes(1);
    });

    const storageListener = mockStorageAddListener.mock.calls[0][0];
    storageListener({ deep_profile_config: { newValue: {} } }, "local");

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalledTimes(2);
    });
  });

  it("injects analysis button and sends analyze message on click", async () => {
    render(<RedditOverlay />);

    await waitFor(() => {
      expect(document.querySelector(".deep-profile-btn")).toBeTruthy();
    });

    const btn = document.querySelector(".deep-profile-btn") as HTMLSpanElement;
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ANALYZE_PROFILE",
          userId: "testuser",
          platform: "reddit",
          forceRefresh: false,
        }),
      );
    });
  });

  it("does not inject button when feature is disabled", async () => {
    mockGetConfig.mockResolvedValueOnce({
      globalEnabled: false,
      platformConfigs: {
        reddit: {
          analysisButtonEnabled: true,
        },
      },
    });

    render(<RedditOverlay />);

    await waitFor(() => {
      expect(document.querySelector(".deep-profile-btn")).toBeNull();
    });
  });
});

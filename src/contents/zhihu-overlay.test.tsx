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
    t: (key: string) => {
      const map: Record<string, string> = {
        loading: "加载中",
        analyzing: "分析中",
        reanalyze: "重新分析",
        error_network: "网络错误",
      };
      return map[key] || key;
    },
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

import ZhihuOverlay from "./zhihu-overlay";

describe("ZhihuOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetConfig.mockResolvedValue({
      globalEnabled: true,
      platformConfigs: {
        zhihu: {
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
      <h1 class="QuestionHeader-title">Zhihu Question</h1>
      <div class="QuestionTopic"><span class="Tag-content">Tech</span></div>
      <div>
        <a href="https://www.zhihu.com/people/testuser">testuser</a>
      </div>
    `;
  });

  it("should be defined", () => {
    expect(ZhihuOverlay).toBeDefined();
  });

  it("should read config and register listeners", async () => {
    const { unmount } = render(<ZhihuOverlay />);

    await waitFor(() => {
      expect(ConfigService.getConfig).toHaveBeenCalled();
      expect(mockRuntimeAddListener).toHaveBeenCalled();
      expect(mockStorageAddListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockRuntimeRemoveListener).toHaveBeenCalled();
    expect(mockStorageRemoveListener).toHaveBeenCalled();
  });

  it("injects analysis button and sends analyze message on click", async () => {
    render(<ZhihuOverlay />);

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
          platform: "zhihu",
          forceRefresh: false,
        }),
      );
    });
  });

  it("does not inject button when feature is disabled", async () => {
    mockGetConfig.mockResolvedValueOnce({
      globalEnabled: false,
      platformConfigs: {
        zhihu: {
          analysisButtonEnabled: true,
        },
      },
    });

    render(<ZhihuOverlay />);

    await waitFor(() => {
      expect(document.querySelector(".deep-profile-btn")).toBeNull();
    });
  });
});

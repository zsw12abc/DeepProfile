import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const {
  mockGetConfig,
  mockSendMessage,
  mockStorageAddListener,
  mockStorageRemoveListener,
} = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockSendMessage: vi.fn(),
  mockStorageAddListener: vi.fn(),
  mockStorageRemoveListener: vi.fn(),
}));

vi.mock("~services/I18nService", () => ({
  I18nService: {
    t: (key: string) => {
      const tMap: Record<string, string> = {
        comment_summary_btn: "分析评论",
        analyzing_comments: "正在分析当前页面的评论...",
        extracting_comments: "正在提取评论数据...",
        ai_reading: "AI 正在阅读大家的观点...",
        anonymous_user: "匿名用户",
        not_enough_comments: "评论数量不足以进行分析",
        comment_analysis_instruction: "，请尝试增加显示的评论数量。",
        comment_analysis_failed: "分析失败",
        comment_analysis_summary: "评论分析总结",
        comment_analysis_ai_generated: "AI 生成",
        sentiment_support: "支持",
        sentiment_neutral: "中立",
        sentiment_oppose: "反对",
        expand_key_points: "展开要点",
        collapse_key_points: "收起要点",
        extension_context_invalidated: "扩展上下文失效",
        extension_context_invalidated_title: "扩展已失效",
        extension_context_invalidated_desc: "请刷新页面后重试",
      };
      return tMap[key] || key;
    },
    init: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

vi.mock("~services/ConfigService", () => ({
  ConfigService: {
    getConfig: mockGetConfig,
  },
}));

import ZhihuComments from "./zhihu-comments";

const createCommentsDOM = (commentCount = 3) => {
  const comments = Array.from({ length: commentCount })
    .map(
      (_, i) => `
      <li data-id="${i + 1}">
        <a class="UserLink-link" href="/people/user-${i + 1}">User ${i + 1}</a>
        <div class="CommentContent">Comment ${i + 1}</div>
        <button aria-label="赞同">赞同 ${i + 1}</button>
      </li>
    `,
    )
    .join("\n");

  document.body.innerHTML = `
    <h1 class="QuestionHeader-title">这是一道测试问题</h1>
    <div class="Comments-container">
      <div class="Comments-header">
        <div>默认 最新</div>
      </div>
      <ul>${comments}</ul>
    </div>
  `;
};

describe("ZhihuComments integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "innerText", {
      configurable: true,
      get() {
        return this.textContent || "";
      },
      set(value: string) {
        this.textContent = value;
      },
    });

    global.chrome = {
      runtime: {
        sendMessage: mockSendMessage,
      },
      storage: {
        onChanged: {
          addListener: mockStorageAddListener,
          removeListener: mockStorageRemoveListener,
        },
      },
    } as any;

    mockGetConfig.mockResolvedValue({
      globalEnabled: true,
      platformConfigs: {
        zhihu: {
          commentAnalysisEnabled: true,
        },
      },
    });

    mockSendMessage.mockImplementation(async (message: any) => {
      if (message.type === "ANALYZE_COMMENTS") {
        return {
          success: true,
          data: {
            summary: "这是评论摘要",
            stance_ratio: { support: 0.5, neutral: 0.3, oppose: 0.2 },
            key_points: [],
            sentiment: "neutral",
          },
        };
      }
      return { success: true };
    });

    createCommentsDOM(3);
  });

  it("injects summary button and runs comment analysis flow", async () => {
    render(<ZhihuComments />);

    const summaryButton = await screen.findByText("分析评论");
    expect(summaryButton).toBeInTheDocument();

    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "TELEMETRY_EVENT",
          name: "comment_analysis_button_clicked",
        }),
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ANALYZE_COMMENTS",
          contextTitle: "这是一道测试问题",
          comments: expect.arrayContaining([
            expect.objectContaining({
              author: "User 1",
              content: "Comment 1",
              likes: 1,
            }),
          ]),
        }),
      );
    });

    expect(await screen.findByText("评论分析总结")).toBeInTheDocument();
    expect(screen.getByText("这是评论摘要")).toBeInTheDocument();
  });

  it("shows error when comments are insufficient", async () => {
    createCommentsDOM(2);
    render(<ZhihuComments />);

    fireEvent.click(await screen.findByText("分析评论"));

    expect(
      await screen.findByText(/评论数量不足以进行分析/),
    ).toBeInTheDocument();
  });

  it("shows extension-context-specific error message", async () => {
    mockSendMessage.mockImplementation(async (message: any) => {
      if (message.type === "ANALYZE_COMMENTS") {
        throw new Error("Extension context invalidated");
      }
      return { success: true };
    });

    render(<ZhihuComments />);
    fireEvent.click(await screen.findByText("分析评论"));

    expect(await screen.findByText(/扩展已失效/)).toBeInTheDocument();
    expect(screen.getByText("请刷新页面后重试")).toBeInTheDocument();
  });

  it("does not inject button when feature is disabled", async () => {
    mockGetConfig.mockResolvedValueOnce({
      globalEnabled: false,
      platformConfigs: {
        zhihu: {
          commentAnalysisEnabled: true,
        },
      },
    });

    render(<ZhihuComments />);

    await waitFor(() => {
      expect(screen.queryByText("分析评论")).not.toBeInTheDocument();
    });
  });
});

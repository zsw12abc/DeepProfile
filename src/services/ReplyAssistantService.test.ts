import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReplyAssistantService } from "./ReplyAssistantService";
import { LLMService } from "./LLMService";

describe("ReplyAssistantService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("injects preferred language into prompt when provided", async () => {
    const generateRawTextMock = vi
      .spyOn(LLMService, "generateRawText")
      .mockResolvedValue("reply text");

    await ReplyAssistantService.generateReply(
      "Friendly",
      {
        targetUser: "Alice",
        pageTitle: "Test Topic",
        answerContent: "Original content",
        conversation: [{ author: "Alice", content: "hello", isTarget: true }],
      },
      "medium",
      "es",
      "Spanish",
      "hola, gracias",
    );

    expect(generateRawTextMock).toHaveBeenCalledTimes(1);
    const [prompt] = generateRawTextMock.mock.calls[0];
    expect(prompt).toContain("Spanish（es）");
    expect(prompt).toContain("[语言检测参考文本]");
    expect(prompt).toContain("hola, gracias");
  });

  it("falls back to context language detection guidance", async () => {
    vi.spyOn(LLMService, "generateRawText").mockResolvedValue("'ok reply'");

    const reply = await ReplyAssistantService.generateReply(
      "Objective",
      {
        targetUser: "Bob",
        pageTitle: "Context",
        answerContent: "Some text",
        conversation: [{ author: "Bob", content: "Thanks", isTarget: true }],
      },
      "short",
    );

    expect(reply).toBe("ok reply");
  });

  it("rewrites output when generated language mismatches preferred language", async () => {
    const generateRawTextMock = vi
      .spyOn(LLMService, "generateRawText")
      .mockResolvedValueOnce("This is english output")
      .mockResolvedValueOnce("这是中文输出");

    const reply = await ReplyAssistantService.generateReply(
      "Friendly",
      {
        targetUser: "Alice",
        pageTitle: "话题",
        answerContent: "内容",
        conversation: [{ author: "Alice", content: "你好", isTarget: true }],
      },
      "medium",
      "zh",
      "Chinese",
      "你好",
    );

    expect(reply).toBe("这是中文输出");
    expect(generateRawTextMock).toHaveBeenCalledTimes(2);
    const secondPrompt = generateRawTextMock.mock.calls[1][0];
    expect(secondPrompt).toContain(
      "Rewrite the following reply in Chinese only",
    );
  });

  it("adds constrained guidance for troll style", async () => {
    const generateRawTextMock = vi
      .spyOn(LLMService, "generateRawText")
      .mockResolvedValue("mock reply");

    await ReplyAssistantService.generateReply(
      "巨魔风格 (Troll)",
      {
        targetUser: "Eve",
        pageTitle: "Debate",
        answerContent: "观点文本",
        conversation: [{ author: "Eve", content: "A", isTarget: true }],
      },
      "medium",
    );

    const [prompt] = generateRawTextMock.mock.calls[0];
    expect(prompt).toContain("风格细则");
    expect(prompt).toContain("禁止辱骂");
    expect(prompt).toContain("不可攻击身份");
  });
});

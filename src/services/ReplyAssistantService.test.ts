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
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectReplyLanguage,
  requestGeneratedReply,
  type ReplyGenerationContext,
} from "./reply-assistant-language-utils";

const baseContext: ReplyGenerationContext = {
  targetUser: "Alice",
  pageTitle: "Test Topic",
  answerContent: "Context content",
  conversation: [{ author: "Alice", content: "Hello there", isTarget: true }],
};

describe("reply-assistant-language-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects Chinese from editable draft text", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "这是一条中文回复";

    const detected = detectReplyLanguage(textarea, baseContext);

    expect(detected.languageCode).toBe("zh");
    expect(detected.languageName).toBe("Chinese");
    expect(detected.source).toContain("中文");
  });

  it("falls back to context text when draft is empty", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "";
    const context: ReplyGenerationContext = {
      ...baseContext,
      conversation: [{ author: "Bob", content: "Thanks for sharing this!" }],
      answerContent: "",
    };

    const detected = detectReplyLanguage(textarea, context);
    expect(detected.languageCode).toBe("en");
  });

  it("sends preferred language metadata with GENERATE_REPLY", async () => {
    const textarea = document.createElement("textarea");
    textarea.value = "que esto gracias para responder";

    const sendMessageMock = vi
      .spyOn(chrome.runtime, "sendMessage")
      .mockResolvedValue({ success: true, data: { reply: "respuesta" } } as any);

    const reply = await requestGeneratedReply({
      platform: "quora",
      tone: "Friendly",
      replyLength: "medium",
      context: baseContext,
      targetInput: textarea,
    });

    expect(reply).toBe("respuesta");
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const payload = sendMessageMock.mock.calls[0][0];
    expect(payload.type).toBe("GENERATE_REPLY");
    expect(payload.preferredLanguage).toBe("es");
    expect(payload.preferredLanguageName).toBe("Spanish");
  });

  it("throws when response is unsuccessful", async () => {
    const textarea = document.createElement("textarea");
    textarea.value = "test";

    vi.spyOn(chrome.runtime, "sendMessage").mockResolvedValue({
      success: false,
      error: "Generation failed",
    } as any);

    await expect(
      requestGeneratedReply({
        platform: "reddit",
        tone: "Objective",
        replyLength: "short",
        context: baseContext,
        targetInput: textarea,
      }),
    ).rejects.toThrow("Generation failed");
  });
});

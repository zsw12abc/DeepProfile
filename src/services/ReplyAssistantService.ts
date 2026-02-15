import { LLMService } from "./LLMService";

type ReplyLength = "short" | "medium" | "long";

export interface ReplyGenerationContext {
  targetUser: string;
  pageTitle?: string;
  answerContent?: string;
  conversation: Array<{
    author: string;
    content: string;
    isTarget?: boolean;
  }>;
}

export class ReplyAssistantService {
  static async generateReply(
    tone: string,
    context: ReplyGenerationContext,
    replyLength: ReplyLength = "medium",
    preferredLanguageCode?: string,
    preferredLanguageName?: string,
    languageDetectionSource?: string,
  ): Promise<string> {
    const prompt = this.buildPrompt(
      tone,
      context,
      replyLength,
      preferredLanguageCode,
      preferredLanguageName,
      languageDetectionSource,
    );
    const raw = await LLMService.generateRawText(prompt);
    const normalized = this.normalizeReply(raw);

    if (
      preferredLanguageCode &&
      normalized &&
      !this.isLikelyLanguage(normalized, preferredLanguageCode)
    ) {
      const rewritePrompt = `Rewrite the following reply in ${preferredLanguageName || preferredLanguageCode} only. Keep the original meaning and tone. Output only the rewritten reply.\n\nReply:\n${normalized}`;
      const rewritten = await LLMService.generateRawText(rewritePrompt);
      return this.normalizeReply(rewritten);
    }

    return normalized;
  }

  private static buildPrompt(
    tone: string,
    context: ReplyGenerationContext,
    replyLength: ReplyLength,
    preferredLanguageCode?: string,
    preferredLanguageName?: string,
    languageDetectionSource?: string,
  ): string {
    const lengthInstruction =
      replyLength === "short"
        ? "输出简短回复，约 1-2 句（或至少 50 字）。"
        : replyLength === "long"
          ? "输出详细回复，约 6-10 句（或至少 300 字）。"
          : "输出标准回复，约 3-5 句（或至少 150 字）。";

    const conversationText = context.conversation
      .map((item, idx) => {
        const targetTag = item.isTarget ? " [你要回复的对象]" : "";
        return `${idx + 1}. ${item.author}${targetTag}: ${item.content}`;
      })
      .join("\n");

    const languageLine =
      preferredLanguageCode && preferredLanguageName
        ? `1. 语言要求（强制）：用户输入语言检测结果是 ${preferredLanguageName}（${preferredLanguageCode}）。你的整段回复必须100%使用该语言，不得夹杂其他语言（专有名词除外）。`
        : "1. 语言要求：请自动检测[对话上下文]或[答主原文]使用的语言，并使用相同语言回复。如果不确定，优先使用英文。";

    const languageDetectionSourceBlock = languageDetectionSource
      ? `
[语言检测参考文本]
${languageDetectionSource}
`
      : "";

    return `你是一个社交平台回复助手。请根据给定上下文，生成一段可以直接发布的回复文本。

[目标用户]
${context.targetUser}

[页面话题]
${context.pageTitle || "(未知话题)"}

[答主原文/讨论主内容]
${context.answerContent || "(未捕获)"}

[对话上下文]
${conversationText || "(未捕获)"}
${languageDetectionSourceBlock}

[写作要求]
${languageLine}
2. 口气必须是：${tone}。
3. 回复对象是「${context.targetUser}」，要贴合其上一条观点。
4. 基于给定对话，不要虚构事实，不要引用未提供的信息。
5. 长度要求：${lengthInstruction}
6. 输出前自检语言：如果不是目标语言，请重写。
7. 只输出回复正文，不要解释，不要加引号，不要 Markdown，不要前缀。`;
  }

  private static normalizeReply(raw: string): string {
    let text = (raw || "").trim();

    text = text
      .replace(/^```[a-zA-Z]*\s*/g, "")
      .replace(/```$/g, "")
      .trim();

    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      text = text.slice(1, -1).trim();
    }

    return text;
  }

  private static isLikelyLanguage(text: string, code: string): boolean {
    const sample = text.trim();
    if (!sample) return true;

    if (code === "zh") return /[\u4E00-\u9FFF]/.test(sample);
    if (code === "ja") return /[\u3040-\u30FF]/.test(sample);
    if (code === "ko") return /[\uAC00-\uD7AF]/.test(sample);
    if (code === "ru") return /[\u0400-\u04FF]/.test(sample);
    if (code === "ar") return /[\u0600-\u06FF]/.test(sample);

    if (code === "en") {
      const latinWords = (sample.match(/[a-zA-Z]+/g) || []).length;
      return latinWords >= 3;
    }

    return true;
  }
}

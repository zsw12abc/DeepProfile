import { LLMService } from "./LLMService";

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
  ): Promise<string> {
    const prompt = this.buildPrompt(tone, context);
    const raw = await LLMService.generateRawText(prompt);
    return this.normalizeReply(raw);
  }

  private static buildPrompt(
    tone: string,
    context: ReplyGenerationContext,
  ): string {
    const conversationText = context.conversation
      .map((item, idx) => {
        const targetTag = item.isTarget ? " [你要回复的对象]" : "";
        return `${idx + 1}. ${item.author}${targetTag}: ${item.content}`;
      })
      .join("\n");

    return `你是一个社交平台回复助手。请根据给定上下文，生成一段可以直接发布的回复文本。

[目标用户]
${context.targetUser}

[页面话题]
${context.pageTitle || "(未知话题)"}

[答主原文/讨论主内容]
${context.answerContent || "(未捕获)"}

[对话上下文]
${conversationText || "(未捕获)"}

[写作要求]
1. 口气必须是：${tone}。
2. 回复对象是「${context.targetUser}」，要贴合其上一条观点。
3. 基于给定对话，不要虚构事实，不要引用未提供的信息。
4. 输出控制在 1-3 句，适合中文社区直接发布。
5. 只输出回复正文，不要解释，不要加引号，不要 Markdown，不要前缀。`;
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
}

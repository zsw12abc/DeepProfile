import { LLMService } from "./LLMService";
import type { CommentItem, CommentAnalysisResult } from "~types";
import { ConfigService } from "./ConfigService";

export class CommentAnalysisService {
  
  static async analyzeComments(comments: CommentItem[], contextTitle: string): Promise<CommentAnalysisResult> {
    if (!comments || comments.length === 0) {
      throw new Error("没有找到可分析的评论");
    }

    // 1. 预处理评论数据，减少Token消耗
    const processedComments = comments.map(c => {
      let text = `${c.author}: ${c.content}`;
      if (c.likes && c.likes > 0) text += ` [${c.likes}赞]`;
      return text;
    }).join('\n');

    // 2. 构建 Prompt
    const prompt = `
你是一个舆情分析专家。请分析以下关于话题【${contextTitle}】的评论区内容。

【评论数据】
${processedComments}

【分析要求】
1.  **立场分布**: 统计支持(Support)、反对(Oppose)和中立(Neutral)的比例。
    *   支持：支持答主/作者观点，或对内容表示赞同。
    *   反对：反驳答主/作者观点，或提出批评。
    *   中立：吃瓜、玩梗、无关讨论或理中客。
2.  **核心观点**: 提取评论区中反复出现的 3-5 个核心论点。
3.  **典型摘录**: 为每个核心观点摘录 1-2 条原话。
4.  **总体情绪**: 判断评论区氛围（积极/消极/平和/争议巨大）。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记）：

{
  "summary": "一句话总结评论区现状（如：评论区两极分化严重，主要围绕XXX展开争论）",
  "stance_ratio": {
    "support": 0.4,
    "oppose": 0.3,
    "neutral": 0.3
  },
  "key_points": [
    {
      "point": "观点概括",
      "count": 10, 
      "type": "support", 
      "example_quotes": ["原文摘录1"]
    }
  ],
  "sentiment": "controversial" 
}
`;

    // 3. 调用 LLM
    try {
      const resultStr = await LLMService.generateRawText(prompt);
      const result = this.parseResult(resultStr);
      return result;
    } catch (error) {
      console.error("Comment analysis failed:", error);
      throw error;
    }
  }

  private static parseResult(jsonStr: string): CommentAnalysisResult {
    try {
      // 清理可能的 Markdown 标记
      let cleanStr = jsonStr.trim();
      if (cleanStr.startsWith('```json')) {
        cleanStr = cleanStr.substring(7);
      }
      if (cleanStr.startsWith('```')) {
        cleanStr = cleanStr.substring(3);
      }
      if (cleanStr.endsWith('```')) {
        cleanStr = cleanStr.substring(0, cleanStr.length - 3);
      }
      cleanStr = cleanStr.trim();
      
      return JSON.parse(cleanStr);
    } catch (e) {
      console.error("Failed to parse comment analysis result:", e, "Raw string:", jsonStr);
      throw new Error("AI 返回的数据格式不正确，无法解析。");
    }
  }
}

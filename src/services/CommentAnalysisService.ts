import { LLMService } from "./LLMService";
import type { CommentItem, CommentAnalysisResult, AnalysisMode } from "~types";
import { ConfigService } from "./ConfigService";
import { I18nService } from "./I18nService";

export class CommentAnalysisService {
  
  static async analyzeComments(comments: CommentItem[], contextTitle: string, contextContent?: string): Promise<CommentAnalysisResult> {
    if (!comments || comments.length === 0) {
      throw new Error("没有找到可分析的评论");
    }

    const config = await ConfigService.getConfig();
    const mode = config.analysisMode || 'balanced';
    const isEn = I18nService.getLanguage() === 'en-US';

    // 1. 预处理评论数据，减少Token消耗
    const processedComments = comments.map(c => {
      let text = `${c.author}: ${c.content}`;
      if (c.likes && c.likes > 0) text += ` [${c.likes}${isEn ? ' likes' : '赞'}]`;
      return text;
    }).join('\n');

    // 2. 构建 Prompt
    let promptContext = isEn ? `Topic【${contextTitle}】` : `话题【${contextTitle}】`;
    if (contextContent) {
        // 限制上下文长度，防止超出 Token 限制
        const truncatedContent = contextContent.length > 2000 ? contextContent.slice(0, 2000) + "..." : contextContent;
        promptContext += isEn ? `

[Topic/Answer Original Text Summary]
${truncatedContent}` : `

【话题/回答原文摘要】
${truncatedContent}`;
    }

    const prompt = this.getPromptForMode(mode, promptContext, processedComments, isEn);

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

  private static getPromptForMode(mode: AnalysisMode, context: string, comments: string, isEn: boolean): string {
    let keyPointsCount = 3;
    let extraAnalysis = "";

    if (mode === 'fast') {
      keyPointsCount = 3;
    } else if (mode === 'balanced') {
      keyPointsCount = 5;
    } else if (mode === 'deep') {
      keyPointsCount = 7;
      extraAnalysis = isEn ? 
      `
5.  **Deep Insights (Optional)**: Identify if there are obvious logical fallacies (e.g., straw man, ad hominem), echo chamber effects, or group polarization phenomena in the comment section. If present, briefly explain in the 'deep_analysis' field.` :
      `
5.  **深度洞察 (可选)**: 识别评论区是否存在明显的逻辑谬误（如稻草人谬误、人身攻击）、回音室效应或群体极化现象。如果存在，请在 'deep_analysis' 字段中简要说明。`;
    }

    const jsonSchema = {
      summary: isEn ? "One-sentence summary of the comment section status" : "一句话总结评论区现状",
      stance_ratio: { support: 0.4, oppose: 0.3, neutral: 0.3 },
      key_points: [{ point: isEn ? "Point Summary" : "观点概括", count: 10, type: "support", example_quotes: [isEn ? "Original Quote" : "原文摘录1"] }],
      sentiment: "controversial",
      ...(mode === 'deep' && { deep_analysis: { has_fallacy: false, fallacy_type: "none", example: "none" } })
    };

    const languageInstruction = isEn ? 
    `IMPORTANT: All analysis results (summary, point summaries, analysis explanations) must be in English, but the example_quotes should remain in the original language.` :
    `重要：所有分析结果（总结、观点概括、分析说明）必须使用中文，但 example_quotes 应保持原始语言。`;

    const instructions = isEn ? 
    `
You are a public opinion analysis expert. Please analyze the following comment section content.
Comment section is about: ${context}

[Comment Data]
${comments}

[Analysis Requirements]
1.  **Stance Distribution**: Calculate the proportion of Support, Oppose, and Neutral.
    *   **Important**: When judging support/opposition, you must base it on the viewpoint of the [topic/answer original text].
    *   Support: Supporting the author's viewpoint or expressing approval of the content.
    *   Oppose: Refuting the author's viewpoint or raising criticism.
    *   Neutral: Observing, making memes, irrelevant discussions, or moderate observers.
2.  **Core Points**: Extract ${keyPointsCount} core arguments that repeatedly appear in the comment section.
3.  **Typical Excerpts**: Extract 1-2 original quotes for each core point. (These should remain in original language)
4.  **Overall Sentiment**: Judge the comment section atmosphere (positive/negative/peaceful/highly controversial).
${extraAnalysis}
${languageInstruction}

Please strictly return the result in the following JSON format (do not include Markdown code block markers):
${JSON.stringify(jsonSchema, null, 2)}
` :
    `
你是一个舆情分析专家。请分析以下评论区内容。
评论区是关于：${context}

【评论数据】
${comments}

【分析要求】
1.  **立场分布**: 统计支持(Support)、反对(Oppose)和中立(Neutral)的比例。
    *   **重要**：判断支持/反对时，必须基于【话题/回答原文】的观点。
    *   支持：支持答主/作者的观点，或对内容表示赞同。
    *   反对：反驳答主/作者的观点，或提出批评。
    *   中立：吃瓜、玩梗、无关讨论或理中客。
2.  **核心观点**: 提取评论区中反复出现的 ${keyPointsCount} 个核心论点。
3.  **典型摘录**: 为每个核心观点摘录 1-2 条原话。（这些应保持原始语言）
4.  **总体情绪**: 判断评论区氛围（积极/消极/平和/争议巨大）。
${extraAnalysis}
${languageInstruction}

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记）：
${JSON.stringify(jsonSchema, null, 2)}
`;

    return instructions;
  }

  private static parseResult(responseStr: string): CommentAnalysisResult {
    let jsonText = responseStr.trim();

    // 1. 尝试移除包裹的 Markdown
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
    }

    try {
        // 2. 尝试直接解析
        return JSON.parse(jsonText);
    } catch (e) {
        console.warn("[DeepProfile] Direct JSON.parse failed. Trying to extract from a larger structure.", e);
        // 3. 如果直接解析失败，尝试从完整的 LLM 响应对象中提取
        try {
            const outerObject = JSON.parse(responseStr); // 使用原始字符串
            if (outerObject.choices && outerObject.choices[0]?.message?.content) {
                // 提取 content 字段，它本身应该是一个 JSON 字符串
                const contentStr = outerObject.choices[0].message.content;
                return JSON.parse(contentStr);
            }
        } catch (e2) {
            // 4. 如果所有尝试都失败
            console.error("[DeepProfile] Could not parse JSON from LLM response.", e2, "Original response string:", responseStr);
            throw new Error("AI 返回的数据格式不正确，无法解析。");
        }
    }
    // 如果代码能运行到这里，说明发生了意料之外的情况
    throw new Error("无法从AI响应中解析出有效的JSON。");
  }
}
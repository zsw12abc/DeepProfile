import { ConfigService } from "./ConfigService"
import type { AIProvider, AnalysisMode } from "~types"

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
  model: string;
}

export interface LLMProvider {
  generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse>
}

export class LLMService {
  private static getSystemPrompt(mode: AnalysisMode): string {
    let basePrompt = `你是一个专业的政治倾向与心理分析师。请根据以下用户的动态（回答和文章），生成一份详细的用户画像。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记）：

{
  "nickname": "用户昵称（如果无法获取则留空）",
  "topic_classification": "对用户关注话题的简要分类（如：国际政治、宏观经济、数码科技、动漫、体育等）",
  "political_leaning": [
    { "label": "标签1", "score": 0.9 },
    { "label": "标签2", "score": 0.7 }
  ], 
  "summary": "简要总结其领域偏好、性格特征和潜在的言论倾向（100字以内）",
  "evidence": [
    {
      "quote": "引用原文片段",
      "analysis": "分析说明",
      "source_title": "来源标题",
      "source_id": "原文中标记的ID，例如 12345"
    }
  ]
}

【！！！绝对指令！！！】
1.  文本被分为了 "RELEVANT CONTENT (★ 重点分析)" 和 "OTHER RECENT CONTENT (仅作性格参考)" 两部分。
2.  你的**所有分析**，尤其是 **topic_classification** 和 **summary**，必须**100%基于** "RELEVANT CONTENT (★ 重点分析)" 部分。
3.  如果 "RELEVANT CONTENT" 部分存在，你必须**完全忽略** "OTHER RECENT CONTENT" 部分的**话题**。例如，如果相关内容是关于科技的，即使其他内容全是政治，topic_classification 也必须是"科技/数码"。
4.  "OTHER RECENT CONTENT" 只能用来辅助判断用户的通用性格（如：严谨、幽默），绝不能影响话题和主要观点判断。
5.  在 evidence 中，source_id 必须对应原文中 [ID:xxxxx] 里的数字。
6.  对于政治倾向标签，必须根据内容的相关性决定是否输出：
    - 如果内容明确涉及政治、经济、社会议题，则输出政治倾向标签
    - 如果内容是动漫、科技、体育、美食等非政治领域，则输出与内容相关的兴趣、专业或性格标签
    - 政治标签包括但不限于：左翼/右翼、自由主义/保守主义、进步/传统、激进/温和、亲资本主义/社会主义、民族主义/国际主义、民粹主义/精英主义、威权/民主、法西斯主义、军国主义、纳粹主义等
    - 非政治标签可包括：技术专家、动漫爱好者、体育迷、美食家、游戏玩家等
    - 评分标准：1.0为极强倾向，0.0为无倾向，0.5为中立
7.  对于政治倾向的识别要精确具体：
    - 经济观点：亲资本主义/社会主义、亲自由市场/计划经济
    - 社会议题：亲个人主义/集体主义、亲全球化/本土化
    - 价值观：亲民主/威权、亲世俗化/传统宗教
    - 意识形态：民族主义、国际主义、民粹主义、法西斯主义、军国主义、纳粹主义等
8.  请保持客观中立，但也要准确反映用户的真实观点，避免过度谨慎而无法输出有意义的标签。
9.  严禁对非政治内容强行关联政治标签。如果话题是动漫，就不要输出政治标签，而是输出与动漫相关的标签。
10. 请始终使用 "political_leaning" 字段，格式为 [{"label": "标签名", "score": 0.X}]，不要使用 "value_orientation" 字段。
`;

    if (mode === 'fast') {
        basePrompt += `\n请快速浏览内容，提取最明显的特征，无需过度解读隐含意义。`;
    } else if (mode === 'deep') {
        basePrompt += `\n【深度分析模式】：
1. 请仔细阅读每一条内容，特别注意用户的语气、修辞手法（如反讽、嘲讽、阴阳怪气）。
2. 不要只看字面意思，要结合上下文理解其真实立场。例如，用户可能通过模仿对方的荒谬言论来进行嘲讽（"低级红高级黑"）。
3. 请先在思维中进行多步推理，确认其核心观点后再生成结论。
4. 对于复杂的政治观点，请给出更细致的标签。`;
    } else {
        basePrompt += `\n请保持客观、中立的分析态度，注意识别明显的反讽。`;
    }

    return basePrompt;
  }

  static async generateProfile(text: string): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    
    // 添加调试输出
    if (config.enableDebug) {
      console.log("【DEBUG】发送给LLM的文本内容：", text);
    }
    
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(text, config.analysisMode || 'balanced')
  }

  private static getProviderInstance(
    type: AIProvider,
    config: any
  ): LLMProvider {
    const apiKey = config.apiKeys[type] || ""
    const baseUrl = config.customBaseUrls[type]
    const customModel = config.customModelNames?.[type]

    switch (type) {
      case "openai":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.openai.com/v1",
          customModel || process.env.PLASMO_PUBLIC_OPENAI_MODEL || "gpt-3.5-turbo"
        )
      case "deepseek":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.deepseek.com/v1",
          customModel || process.env.PLASMO_PUBLIC_DEEPSEEK_MODEL || "deepseek-chat"
        )
      case "qwen":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
          customModel || "qwen-turbo"
        )
      case "custom":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.openai.com/v1", // Default fallback
          customModel || "gpt-3.5-turbo"
        )
      case "gemini":
        return new GeminiProvider(
          apiKey,
          customModel || process.env.PLASMO_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash"
        )
      case "ollama":
        return new OllamaProvider(
          baseUrl || "http://localhost:11434",
          customModel || process.env.PLASMO_PUBLIC_OLLAMA_MODEL || "llama3"
        )
      default:
        throw new Error(`Unsupported provider: ${type}`)
    }
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string
  ) {}

  async generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse> {
    if (!this.apiKey && !this.baseUrl.includes("localhost")) {
      throw new Error("API Key is required")
    }

    const temperature = mode === 'deep' ? 0.5 : 0.7;

    const startTime = Date.now();
    const url = `${this.baseUrl}/chat/completions`
    
    // 准备请求数据以便调试
    const requestData = {
      model: this.model,
      messages: [
        { role: "system", content: (LLMService as any).getSystemPrompt(mode) },
        { role: "user", content: text }
      ],
      temperature: temperature,
      response_format: { type: "json_object" } 
    };
    
    // 输出调试信息
    const config = await ConfigService.getConfig();
    if (config.enableDebug) {
      console.log("【DEBUG】发送给OpenAI兼容API的请求：", JSON.stringify(requestData, null, 2));
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const durationMs = Date.now() - startTime;

    return {
        content: data.choices[0]?.message?.content || "{}",
        usage: data.usage,
        durationMs,
        model: this.model
    }
  }
}

class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse> {
    if (!this.apiKey) throw new Error("API Key is required for Gemini")

    const startTime = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`
    
    const prompt = (LLMService as any).getSystemPrompt(mode) + "\n\n用户动态:\n" + text;
    
    // 输出调试信息
    const config = await ConfigService.getConfig();
    if (config.enableDebug) {
      console.log("【DEBUG】发送给Gemini的提示词：", prompt);
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
      })
    })

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const usage = data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount,
        completion_tokens: data.usageMetadata.candidatesTokenCount,
        total_tokens: data.usageMetadata.totalTokenCount
    } : undefined;

    return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || "{}",
        usage,
        durationMs,
        model: this.model
    }
  }
}

class OllamaProvider implements LLMProvider {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse> {
    const startTime = Date.now();
    const url = `${this.baseUrl}/api/generate`
    
    const prompt = (LLMService as any).getSystemPrompt(mode) + "\n\n" + text;
    
    // 输出调试信息
    const config = await ConfigService.getConfig();
    if (config.enableDebug) {
      console.log("【DEBUG】发送给Ollama的提示词：", prompt);
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        format: "json", 
        stream: false
      })
    })

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.status}`)
    }

    const data = await response.json()
    const usage = {
        prompt_tokens: data.prompt_eval_count,
        completion_tokens: data.eval_count,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    };

    return {
        content: data.response,
        usage,
        durationMs,
        model: this.model
    }
  }
}
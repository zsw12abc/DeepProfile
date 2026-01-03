import { ConfigService } from "./ConfigService"
import type { AIProvider } from "~types"

export interface LLMProvider {
  generateProfile(text: string): Promise<string>
}

export class LLMService {
  private static SYSTEM_PROMPT = `你是一个专业的政治倾向与心理分析师。请根据以下用户的知乎动态（回答和文章），生成一份详细的用户画像。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记）：

{
  "nickname": "用户昵称（如果无法获取则留空）",
  "political_leaning": ["标签1", "标签2"], 
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

关于 political_leaning 标签，请使用如：自由主义、保守主义、左翼、右翼、民族主义、建制派、反建制派、女权主义、工业党、入关学 等具体标签。如果特征不明显，可以使用“温和”、“中立”等。

请务必基于用户提供的【回答内容】进行分析，而不仅仅是看他回答了什么问题。
在 evidence 中，source_id 必须对应原文中 [ID:xxxxx] 里的数字。

请保持客观、中立的分析态度。`

  static async generateProfile(text: string): Promise<string> {
    const config = await ConfigService.getConfig()
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(text)
  }

  private static getProviderInstance(
    type: AIProvider,
    config: any
  ): LLMProvider {
    const apiKey = config.apiKeys[type] || ""
    const baseUrl = config.customBaseUrls[type]

    switch (type) {
      case "openai":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.openai.com/v1",
          process.env.PLASMO_PUBLIC_OPENAI_MODEL || "gpt-3.5-turbo"
        )
      case "deepseek":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.deepseek.com/v1",
          process.env.PLASMO_PUBLIC_DEEPSEEK_MODEL || "deepseek-chat"
        )
      case "gemini":
        return new GeminiProvider(
          apiKey,
          process.env.PLASMO_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash"
        )
      case "ollama":
        return new OllamaProvider(
          baseUrl || "http://localhost:11434",
          process.env.PLASMO_PUBLIC_OLLAMA_MODEL || "llama3"
        )
      default:
        throw new Error(`Unsupported provider: ${type}`)
    }
  }

  static getSystemPrompt(): string {
    return this.SYSTEM_PROMPT
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string
  ) {}

  async generateProfile(text: string): Promise<string> {
    if (!this.apiKey && !this.baseUrl.includes("localhost")) {
      throw new Error("API Key is required")
    }

    const url = `${this.baseUrl}/chat/completions`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: LLMService.getSystemPrompt() },
          { role: "user", content: text }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" } // Force JSON output if supported
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || "{}"
  }
}

class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async generateProfile(text: string): Promise<string> {
    if (!this.apiKey) throw new Error("API Key is required for Gemini")

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: LLMService.getSystemPrompt() + "\n\n用户动态:\n" + text }
            ]
          }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  }
}

class OllamaProvider implements LLMProvider {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async generateProfile(text: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: LLMService.getSystemPrompt() + "\n\n" + text,
        format: "json", // Force JSON
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.status}`)
    }

    const data = await response.json()
    return data.response
  }
}

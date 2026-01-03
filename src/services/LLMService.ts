import { ConfigService } from "./ConfigService"
import type { AIProvider } from "~types"

export interface LLMProvider {
  generateProfile(text: string): Promise<string>
}

export class LLMService {
  private static SYSTEM_PROMPT = `你是一个心理分析师，请根据以下用户的知乎动态，简要总结其领域偏好、性格特征和潜在的言论倾向。请保持客观，字数控制在 100 字以内。`

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
          "gpt-3.5-turbo"
        )
      case "deepseek":
        return new OpenAICompatibleProvider(
          apiKey,
          baseUrl || "https://api.deepseek.com/v1",
          "deepseek-chat"
        )
      case "gemini":
        return new GeminiProvider(apiKey)
      case "ollama":
        return new OllamaProvider(baseUrl || "http://localhost:11434")
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
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || "No response generated"
  }
}

class GeminiProvider implements LLMProvider {
  constructor(private apiKey: string) {}

  async generateProfile(text: string): Promise<string> {
    if (!this.apiKey) throw new Error("API Key is required for Gemini")

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`
    
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
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
  }
}

class OllamaProvider implements LLMProvider {
  constructor(private baseUrl: string) {}

  async generateProfile(text: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", // Default model, could be configurable
        prompt: LLMService.getSystemPrompt() + "\n\n" + text,
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

import { ConfigService } from "./ConfigService"
import type { AIProvider, AnalysisMode, MacroCategory } from "~types"
import { LabelService } from "./LabelService"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"

export interface LLMResponse {
  content: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
  model: string;
}

export interface LLMProvider {
  generateProfile(text: string, mode: AnalysisMode, categoryName: string): Promise<LLMResponse>;
  generateRawText(prompt: string): Promise<string>;
}

export class LLMService {
  private static getSystemPrompt(mode: AnalysisMode, categoryName: string): string {
    const labelService = LabelService.getInstance();
    const standardLabels = labelService.getStandardLabelsForLLM();
    
    // 终极降敏版 Prompt
    let basePrompt = `你是一个社会学研究员，正在进行一项关于网络亚文化和公众价值观的学术研究。请根据提供的文本材料，客观分析作者的价值取向。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记）：

{
  "nickname": "用户昵称",
  "topic_classification": "话题分类",
  "value_orientation": [
    { "label": "标签ID", "score": 0.9 }
  ], 
  "summary": "简要总结（100字以内）",
  "evidence": [
    {
      "quote": "引用原文",
      "analysis": "分析说明",
      "source_title": "来源标题",
      "source_id": "ID"
    }
  ]
}

【指令】
1.  【相关性判断】当前研究领域：【${categoryName}】。如果内容与此领域完全无关，请在 summary 中说明，并返回空 value_orientation。
2.  【客观中立】请使用学术、中立的语言进行描述，避免使用激进或情绪化的词汇。
3.  【标签选择】请根据内容，从下方的标准标签库中选择最匹配的标签。
4.  【ID 约束】必须使用标签库中定义的【标签ID】（如 'ideology'），严禁使用中文名称。
5.  【评分标准】1.0 代表强烈倾向于标签右侧描述，-1.0 代表强烈倾向于左侧描述。

【标准标签库】
${standardLabels}
`;

    if (mode === 'deep') {
        basePrompt += `\n【深度模式】：请深入分析文本中的修辞、隐喻和深层逻辑。`;
    }

    return basePrompt;
  }

  static async generateProfile(text: string, categoryName: string): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    
    if (config.enableDebug) {
      console.log("【LANGCHAIN REQUEST】发送给LLM的内容：", text);
    }
    
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(text, config.analysisMode || 'balanced', categoryName)
  }

  static async generateRawText(prompt: string): Promise<string> {
    const config = await ConfigService.getConfig();
    const provider = this.getProviderInstance(config.selectedProvider, config);
    return provider.generateRawText(prompt);
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
        return new LangChainProvider(
          "openai",
          apiKey,
          baseUrl || "https://api.openai.com/v1",
          customModel || process.env.PLASMO_PUBLIC_OPENAI_MODEL || "gpt-3.5-turbo"
        )
      case "deepseek":
        return new LangChainProvider(
          "deepseek",
          apiKey,
          baseUrl || "https://api.deepseek.com/v1",
          customModel || process.env.PLASMO_PUBLIC_DEEPSEEK_MODEL || "deepseek-chat"
        )
      case "qwen":
        return new LangChainProvider(
          "qwen",
          apiKey,
          baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
          customModel || "qwen-turbo"
        )
      case "custom":
        return new LangChainProvider(
          "custom",
          apiKey,
          baseUrl || "https://api.openai.com/v1", // Default fallback
          customModel || "gpt-3.5-turbo"
        )
      case "gemini":
        return new LangChainProvider(
          "gemini",
          apiKey,
          undefined, // Gemini doesn't use base URL
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

class LangChainProvider implements LLMProvider {
  private llm: any;
  private rawLlm: any;

  constructor(
    private provider: string,
    private apiKey: string,
    private baseUrl?: string,
    private model?: string
  ) {
    this.initializeLLM();
  }

  private initializeLLM() {
    const temperature = 0.5;

    switch (this.provider) {
      case "openai":
      case "deepseek":
      case "qwen":
      case "custom":
        this.llm = new ChatOpenAI({
          openAIApiKey: this.apiKey,
          configuration: { baseURL: this.baseUrl },
          modelName: this.model,
          temperature: temperature,
          response_format: { type: "json_object" }
        });
        this.rawLlm = new ChatOpenAI({
          openAIApiKey: this.apiKey,
          configuration: { baseURL: this.baseUrl },
          modelName: this.model,
          temperature: 0 // For classification, we want deterministic output
        });
        break;
      case "gemini":
        this.llm = new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          modelName: this.model,
          temperature: temperature,
          responseMimeType: "application/json"
        });
        this.rawLlm = new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          modelName: this.model,
          temperature: 0
        });
        break;
      default:
        throw new Error(`Unsupported provider: ${this.provider}`)
    }
  }

  async generateRawText(prompt: string): Promise<string> {
    const messages = [new SystemMessage("You are a helpful assistant."), new HumanMessage(prompt)];
    const chain = RunnableSequence.from([() => this.rawLlm, new StringOutputParser()]);
    const result = await chain.invoke(messages);
    return result.trim();
  }

  async generateProfile(text: string, mode: AnalysisMode, categoryName: string): Promise<LLMResponse> {
    if (!this.apiKey && !this.baseUrl?.includes("localhost")) {
      throw new Error("API Key is required")
    }

    const startTime = Date.now();
    
    try {
      const messages = [
        new SystemMessage((LLMService as any).getSystemPrompt(mode, categoryName)),
        new HumanMessage(text)
      ];
      
      const chain = RunnableSequence.from([
        () => this.llm,
        new StringOutputParser()
      ]);
      
      const result = await chain.invoke(messages);
      
      const durationMs = Date.now() - startTime;

      const validatedContent = this.validateAndFixResponse(result);
      const parsedContent = JSON.parse(validatedContent);
      
      const debugConfig = await ConfigService.getConfig();
      if (debugConfig.enableDebug) {
        console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：", parsedContent.value_orientation);
      }
      
      return {
          content: parsedContent,
          usage: undefined,
          durationMs,
          model: this.model
      }
    } catch (error) {
      console.error("LangChain API Error:", error);
      if (error.message && (error.message.includes('inappropriate content') || error.message.includes('data_inspection_failed'))) {
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          value_orientation: [],
          summary: "内容安全审查失败：分析的内容可能涉及敏感话题，已被 AI 服务商拦截。建议更换为 DeepSeek 或 OpenAI 模型重试。",
          evidence: []
        }, null, 2);
        
        const durationMs = Date.now() - startTime;
        return {
          content: defaultResponse,
          usage: undefined,
          durationMs,
          model: this.model
        };
      }
      throw error;
    }
  }
  
  private validateAndFixResponse(response: string): string {
    try {
      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch (parseError) {
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.substring(7);
        }
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.substring(3);
        }
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        }
        cleanedResponse = cleanedResponse.trim();
        parsed = JSON.parse(cleanedResponse);
      }
      
      if (!parsed.value_orientation) {
        parsed.value_orientation = parsed.political_leaning || [];
      }
      delete parsed.political_leaning;
      
      if (Array.isArray(parsed.value_orientation)) {
        parsed.value_orientation = parsed.value_orientation.map(item => {
          if (typeof item === 'string') {
            return { label: item.trim(), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score));
            return { label: String(item.label).trim(), score };
          }
          return { label: "未知", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      return JSON.stringify({
        nickname: "",
        topic_classification: "未知分类",
        value_orientation: [],
        summary: "分析失败",
        evidence: []
      }, null, 2);
    }
  }
}

class OllamaProvider implements LLMProvider {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async generateRawText(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama raw text API Error: ${response.status}`);
    }
    const data = await response.json();
    return data.response.trim();
  }

  async generateProfile(text: string, mode: AnalysisMode, categoryName: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const url = `${this.baseUrl}/api/generate`
    
    const prompt = (LLMService as any).getSystemPrompt(mode, categoryName) + "\n\n" + text;
    
    const config = await ConfigService.getConfig();
    if (config.enableDebug) {
      console.log("【LANGCHAIN REQUEST】发送给LLM的内容：", prompt);
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
      const errorText = await response.text();
      console.error(`Ollama API Error: ${response.status}`, errorText);
      
      if (errorText.includes('inappropriate') || errorText.includes('data_inspection_failed')) {
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          value_orientation: [],
          summary: "内容安全审查失败：分析的内容可能涉及敏感话题，已被 AI 服务商拦截。建议更换为 DeepSeek 或 OpenAI 模型重试。",
          evidence: []
        }, null, 2);
        
        return {
          content: defaultResponse,
          usage: undefined,
          durationMs,
          model: this.model
        };
      }
      
      throw new Error(`Ollama API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const usage = {
        prompt_tokens: data.prompt_eval_count,
        completion_tokens: data.eval_count,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    };

    if (config.enableDebug) {
      console.log("【LANGCHAIN RESPONSE】LLM返回的JSON：", data.response);
    }

    const content = data.response || "{}";
    const validatedContent = this.validateAndFixResponse(content);
    const parsedContent = JSON.parse(validatedContent);
    
    const debugConfig = await ConfigService.getConfig();
    if (debugConfig.enableDebug) {
      console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：", parsedContent.value_orientation);
    }
    
    return {
        content: parsedContent,
        usage,
        durationMs,
        model: this.model
    }
  }
  
  private validateAndFixResponse(response: string): string {
    try {
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }
      cleanedResponse = cleanedResponse.trim();
      
      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.value_orientation) {
        parsed.value_orientation = parsed.political_leaning || [];
      }
      delete parsed.political_leaning;
      
      if (Array.isArray(parsed.value_orientation)) {
        parsed.value_orientation = parsed.value_orientation.map(item => {
          if (typeof item === 'string') {
            return { label: item.trim(), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score));
            return { label: String(item.label).trim(), score };
          }
          return { label: "未知", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      return JSON.stringify({
        nickname: "",
        topic_classification: "未知分类",
        value_orientation: [],
        summary: "分析失败",
        evidence: []
      }, null, 2);
    }
  }
}

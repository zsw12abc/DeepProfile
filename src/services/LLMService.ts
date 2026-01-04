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
    
    let basePrompt = `你是一个专业的政治倾向与心理分析师。请根据以下用户的动态（回答和文章），生成一份详细的用户画像。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记，返回格式化后的JSON，包含适当的缩进和换行以提高可读性）：

{
  "nickname": "用户昵称（如果无法获取则留空）",
  "topic_classification": "对用户关注话题的简要分类（如：国际政治、宏观经济、数码科技、动漫、体育等）",
  "political_leaning": [
    { "label": "标签ID", "score": 0.9 },
    { "label": "标签ID", "score": 0.7 }
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
1.  【话题一致性检查】当前讨论的领域是：【${categoryName}】。在分析前，请首先判断提供的用户言论是否与该领域相关。如果完全不相关（例如，当前领域是‘娱乐’，但言论全是关于‘政治’的），请直接在 'summary' 字段中说明这一点，并将 'political_leaning' 数组设置为空 []。只有在内容与当前领域相关时，才进行打分。
2.  你的所有分析，尤其是 topic_classification 和 summary，必须100%基于 "RELEVANT CONTENT (★ 重点分析)" 部分。
3.  在 evidence 中，source_id 必须对应原文中 [ID:xxxxx] 里的数字。
4.  【领域自适应】请首先根据用户内容，判断其主要属于哪个分类（Politics, Economy, Society...）。然后，你必须只从该分类下的标签中进行选择和打分。例如，如果内容是关于科技的，就只使用 technology 分类下的标签。
5.  【ID 约束】在 "political_leaning" 数组中，"label" 字段必须严格使用下面提供的【标签ID】 (例如 'ideology', 'authority', 'market_vs_gov')，绝对不可以使用【标签名称】 (例如 '左派 vs 右派')。
6.  对于每个选择的标签，提供-1.0到1.0的精确分数，其中：
    * 正值表示偏向标签名称右边的选项（如：右派、威权主义、市场主导等）
    * 负值表示偏向标签名称左边的选项（如：左派、自由意志、政府干预等）
    * 绝对值表示倾向强度，绝对值越大倾向越明显
7.  请始终使用 "political_leaning" 字段，格式为 [{"label": "标签ID", "score": 0.X}]。
8.  请直接返回JSON格式内容，不要添加任何Markdown代码块标记（如\`\`\`json 或 \`\`\`）。

以下是所有可用的标签分类和标签定义：
${standardLabels}
`;

    if (mode === 'deep') {
        basePrompt += `\n【深度分析模式】：
1. 请仔细阅读每一条内容，特别注意用户的语气、修辞手法（如反讽、嘲讽、阴阳怪气）。
2. 不要只看字面意思，要结合上下文理解其真实立场。`;
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
        console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：", parsedContent.political_leaning);
      }
      
      return {
          content: parsedContent,
          usage: undefined,
          durationMs,
          model: this.model
      }
    } catch (error) {
      console.error("LangChain API Error:", error);
      if (error.message && (error.message.includes('inappropriate content') || error.message.includes('不当内容'))) {
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          political_leaning: [],
          summary: "由于内容安全策略，无法生成详细分析",
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
      
      if (!parsed.political_leaning) {
        parsed.political_leaning = [];
      }
      
      if (Array.isArray(parsed.political_leaning)) {
        parsed.political_leaning = parsed.political_leaning.map(item => {
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
        political_leaning: [],
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
      
      if (errorText.includes('inappropriate') || errorText.includes('不当内容')) {
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          political_leaning: [],
          summary: "由于内容安全策略，无法生成详细分析",
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
      console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：", parsedContent.political_leaning);
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
      
      if (!parsed.political_leaning) {
        parsed.political_leaning = [];
      }
      
      if (Array.isArray(parsed.political_leaning)) {
        parsed.political_leaning = parsed.political_leaning.map(item => {
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
        political_leaning: [],
        summary: "分析失败",
        evidence: []
      }, null, 2);
    }
  }
}

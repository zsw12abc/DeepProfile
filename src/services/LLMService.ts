import { ConfigService } from "./ConfigService"
import type { AIProvider, AnalysisMode } from "~types"
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
  generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse>
}

export class LLMService {
  private static getSystemPrompt(mode: AnalysisMode): string {
    const labelService = LabelService.getInstance();
    const standardLabels = labelService.getStandardLabelsForLLM();
    
    let basePrompt = `你是一个专业的政治倾向与心理分析师。请根据以下用户的动态（回答和文章），生成一份详细的用户画像。

请严格按照以下 JSON 格式返回结果（不要包含 Markdown 代码块标记，返回格式化后的JSON，包含适当的缩进和换行以提高可读性）：

{
  "nickname": "用户昵称（如果无法获取则留空）",
  "topic_classification": "对用户关注话题的简要分类（如：国际政治、宏观经济、数码科技、动漫、体育等）",
  "political_leaning": [
    { "label": "标签名", "score": 0.9 },
    { "label": "标签名", "score": 0.7 }
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
    - 评分标准：1.0为极强倾向，-1.0为极强反向倾向，0.0为中立
7.  对于政治倾向的识别要精确具体，使用以下标准化标签系统：
${standardLabels}
    - 请从上述标签中选择适用的标签，而不是创建新标签
    - 对于每个选择的标签，提供-1.0到1.0的精确分数，其中：
      * 正值表示偏向标签名称右边的选项（如：右派、自由、激进、威权、资本主义、全球主义等）
      * 负值表示偏向标签名称左边的选项（如：左派、保守、温和、自由、社会主义、民族主义等）
      * 绝对值表示倾向强度，绝对值越大倾向越明显
    - 如果内容涉及多个类别，请从每个相关类别中选择最显著的标签
8.  请保持客观中立，但也要准确反映用户的真实观点，避免过度谨慎而无法输出有意义的标签。
9.  严禁对非政治内容强行关联政治标签。如果话题是动漫，就不要输出政治标签，而是输出与动漫相关的标签。
10. 请始终使用 "political_leaning" 字段，格式为 [{"label": "标签名", "score": 0.X}]，不要使用 "value_orientation" 字段。
11. 请直接返回JSON格式内容，不要添加任何Markdown代码块标记（如\`\`\`json 或 \`\`\`）。
12. 请返回格式化后的JSON，包含适当的缩进和换行，以提高可读性。
`;

    // 根据话题分类添加额外指导
    // 注意：实际话题分类会在运行时提供，这里仅作为示例
    basePrompt += `
12. 话题相关性指导：
    - 如果话题分类为"政治"，请重点关注政治倾向、经济观点等标签
    - 如果话题分类为"科技"，请重点关注技术观点、创新导向等标签
    - 如果话题分类为"经济"，请重点关注经济政策相关标签
    - 如果话题分类为"文化"，请重点关注文化价值观相关标签
    - 如果话题分类为"环境"，请重点关注环境保护相关标签
    - 请确保输出的标签与话题分类高度相关
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
    
    // 添加调试输出 - 只输出发送给LLM的内容
    if (config.enableDebug) {
      console.log("【LANGCHAIN REQUEST】发送给LLM的内容：", text);
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
        // For Ollama, we'll keep the original implementation since LangChain doesn't have native Ollama integration
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

  constructor(
    private provider: string,
    private apiKey: string,
    private baseUrl?: string,
    private model?: string
  ) {
    this.initializeLLM();
  }

  private initializeLLM() {
    const temperature = 0.5; // Set a consistent temperature for all models

    switch (this.provider) {
      case "openai":
      case "deepseek":
      case "qwen":
      case "custom":
        this.llm = new ChatOpenAI({
          openAIApiKey: this.apiKey,
          configuration: {
            baseURL: this.baseUrl
          },
          modelName: this.model,
          temperature: temperature,
          response_format: { type: "json_object" } // Ensure JSON response format
        });
        break;
      case "gemini":
        this.llm = new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          modelName: this.model,
          temperature: temperature,
          responseMimeType: "application/json" // Ensure JSON response format for Gemini
        });
        break;
      default:
        throw new Error(`Unsupported provider: ${this.provider}`)
    }
  }

  async generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse> {
    if (!this.apiKey && !this.baseUrl?.includes("localhost")) {
      throw new Error("API Key is required")
    }

    const startTime = Date.now();
    
    try {
      const messages = [
        new SystemMessage((LLMService as any).getSystemPrompt(mode)),
        new HumanMessage(text)
      ];
      
      // Create a simple chain to process the response
      const chain = RunnableSequence.from([
        () => this.llm,
        new StringOutputParser()
      ]);
      
      const result = await chain.invoke(messages);
      
      const durationMs = Date.now() - startTime;

      // 验证和处理响应
      const validatedContent = this.validateAndFixResponse(result);
      const parsedContent = JSON.parse(validatedContent); // 解析为对象而不是保持为字符串
      
      // 调试输出 - 显示LLM返回的标签分数
      const debugConfig = await ConfigService.getConfig();
      if (debugConfig.enableDebug) {
        try {
          if (parsedContent.political_leaning && parsedContent.political_leaning.length > 0) {
            console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：");
            for (const label of parsedContent.political_leaning) {
              console.log(`  - ${label.label}: ${label.score}`);
            }
          } else {
            console.log("【LANGCHAIN LABEL SCORES】LLM未返回任何标签");
          }
        } catch (e) {
          console.error("【LANGCHAIN LABEL SCORES】解析标签分数失败：", e);
        }
      }
      
      // Note: LangChain doesn't provide token usage in the same way as direct API calls
      // We'll return undefined for usage for now
      return {
          content: parsedContent,  // 直接返回解析后的对象
          usage: undefined,
          durationMs,
          model: this.model
      }
    } catch (error) {
      console.error("LangChain API Error:", error);
      // 检查错误是否与不当内容相关
      if (error.message && (error.message.includes('inappropriate content') || error.message.includes('不当内容'))) {
        // 返回一个默认的、安全的响应
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          political_leaning: [],
          summary: "由于内容安全策略，无法生成详细分析",
          evidence: []
        }, null, 2);  // 格式化JSON，增加缩进
        
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
      // 首先尝试直接解析响应，如果响应已经是格式良好的JSON字符串（带转义）
      let parsed;
      try {
        // 直接尝试解析，这会处理像"{\"nickname\": \"...\"}"这样的转义字符串
        parsed = JSON.parse(response);
      } catch (parseError) {
        // 如果直接解析失败，尝试清理Markdown标记后再解析
        let cleanedResponse = response.trim();
        
        // 处理各种可能的Markdown代码块标记
        // 移除开头的 ```json
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.substring(7);
        }
        // 移除开头的 ```
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.substring(3);
        }
        // 移除结尾的 ```
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        }
        
        cleanedResponse = cleanedResponse.trim();
        
        // 尝试解析清理后的响应
        parsed = JSON.parse(cleanedResponse);
      }
      
      // 验证必需字段
      if (!parsed.political_leaning) {
        parsed.political_leaning = [];
      }
      
      // 验证political_leaning格式并修复分数
      if (Array.isArray(parsed.political_leaning)) {
        parsed.political_leaning = parsed.political_leaning.map(item => {
          if (typeof item === 'string') {
            // 如果是字符串格式，转换为对象格式
            return { label: item.trim(), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            // 确保分数在-1到1范围内
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score)); // 限制在-1到1范围内
            return { label: String(item.label).trim(), score };
          }
          return { label: "未知", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);  // 格式化JSON，增加缩进
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      // 如果解析失败，尝试更激进的清理方法
      try {
        // 查找JSON对象的开始和结束位置
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(extractedJson);
          
          // 验证必需字段
          if (!parsed.political_leaning) {
            parsed.political_leaning = [];
          }
          
          // 验证political_leaning格式并修复分数
          if (Array.isArray(parsed.political_leaning)) {
            parsed.political_leaning = parsed.political_leaning.map(item => {
              if (typeof item === 'string') {
                // 如果是字符串格式，转换为对象格式
                return { label: item.trim(), score: 0.5 };
              } else if (typeof item === 'object' && item.label) {
                // 确保分数在-1到1范围内
                let score = item.score || 0.5;
                score = Math.max(-1, Math.min(1, score)); // 限制在-1到1范围内
                return { label: String(item.label).trim(), score };
              }
              return { label: "未知", score: 0.5 };
            });
          }
          
          return JSON.stringify(parsed, null, 2);  // 格式化JSON，增加缩进
        }
      } catch (ex) {
        console.error("Failed to extract JSON from response:", ex);
      }
      
      // 如果所有尝试都失败，返回一个默认格式
      return JSON.stringify({
        nickname: "",
        topic_classification: "未知分类",
        political_leaning: [],
        summary: "分析失败",
        evidence: []
      }, null, 2);  // 格式化JSON，增加缩进
    }
  }
}

// Keep the original providers for Ollama support since LangChain doesn't have native Ollama integration
class OllamaProvider implements LLMProvider {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async generateProfile(text: string, mode: AnalysisMode): Promise<LLMResponse> {
    const startTime = Date.now();
    const url = `${this.baseUrl}/api/generate`
    
    const prompt = (LLMService as any).getSystemPrompt(mode) + "\n\n" + text;
    
    // 输出调试信息 - 只在启用调试时输出，避免重复
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
      // 检查是否是内容安全错误
      const errorText = await response.text();
      console.error(`Ollama API Error: ${response.status}`, errorText);
      
      if (errorText.includes('inappropriate') || errorText.includes('不当内容')) {
        const defaultResponse = JSON.stringify({
          nickname: "",
          topic_classification: "内容分析",
          political_leaning: [],
          summary: "由于内容安全策略，无法生成详细分析",
          evidence: []
        }, null, 2);  // 格式化JSON，增加缩进
        
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

    // 调试输出 - 输出LLM返回的原始JSON
    if (config.enableDebug) {
      console.log("【LANGCHAIN RESPONSE】LLM返回的JSON：", data.response);
    }

    // 验证和处理响应
    const content = data.response || "{}";
    const validatedContent = this.validateAndFixResponse(content);
    const parsedContent = JSON.parse(validatedContent); // 解析为对象而不是保持为字符串
    
    // 调试输出 - 显示LLM返回的标签分数
    const debugConfig = await ConfigService.getConfig();
    if (debugConfig.enableDebug) {
      try {
        if (parsedContent.political_leaning && parsedContent.political_leaning.length > 0) {
          console.log("【LANGCHAIN LABEL SCORES】LLM评判的标签分数：");
          for (const label of parsedContent.political_leaning) {
            console.log(`  - ${label.label}: ${label.score}`);
          }
        } else {
          console.log("【LANGCHAIN LABEL SCORES】LLM未返回任何标签");
        }
      } catch (e) {
        console.error("【LANGCHAIN LABEL SCORES】解析标签分数失败：", e);
      }
    }
    
    return {
        content: parsedContent,  // 直接返回解析后的对象
        usage,
        durationMs,
        model: this.model
    }
  }
  
  private validateAndFixResponse(response: string): string {
    try {
      // 清理响应内容，移除可能的Markdown代码块标记
      let cleanedResponse = response.trim();
      
      // 处理各种可能的Markdown代码块标记
      // 移除开头的 ```json
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      }
      // 移除开头的 ```
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      // 移除结尾的 ```
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }
      
      cleanedResponse = cleanedResponse.trim();
      
      // 尝试解析响应
      const parsed = JSON.parse(cleanedResponse);
      
      // 验证必需字段
      if (!parsed.political_leaning) {
        parsed.political_leaning = [];
      }
      
      // 验证political_leaning格式并修复分数
      if (Array.isArray(parsed.political_leaning)) {
        parsed.political_leaning = parsed.political_leaning.map(item => {
          if (typeof item === 'string') {
            // 如果是字符串格式，转换为对象格式
            return { label: item.trim(), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            // 确保分数在-1到1范围内
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score)); // 限制在-1到1范围内
            return { label: String(item.label).trim(), score };
          }
          return { label: "未知", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);  // 格式化JSON，增加缩进
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      // 如果解析失败，尝试更激进的清理方法
      try {
        // 查找JSON对象的开始和结束位置
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(extractedJson);
          
          // 验证必需字段
          if (!parsed.political_leaning) {
            parsed.political_leaning = [];
          }
          
          // 验证political_leaning格式并修复分数
          if (Array.isArray(parsed.political_leaning)) {
            parsed.political_leaning = parsed.political_leaning.map(item => {
              if (typeof item === 'string') {
                // 如果是字符串格式，转换为对象格式
                return { label: item.trim(), score: 0.5 };
              } else if (typeof item === 'object' && item.label) {
                // 确保分数在-1到1范围内
                let score = item.score || 0.5;
                score = Math.max(-1, Math.min(1, score)); // 限制在-1到1范围内
                return { label: String(item.label).trim(), score };
              }
              return { label: "未知", score: 0.5 };
            });
          }
          
          return JSON.stringify(parsed, null, 2);  // 格式化JSON，增加缩进
        }
      } catch (ex) {
        console.error("Failed to extract JSON from response:", ex);
      }
      
      // 如果所有尝试都失败，返回一个默认格式
      return JSON.stringify({
        nickname: "",
        topic_classification: "未知分类",
        political_leaning: [],
        summary: "分析失败",
        evidence: []
      }, null, 2);  // 格式化JSON，增加缩进
    }
  }
}
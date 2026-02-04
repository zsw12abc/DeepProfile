import { ConfigService } from "./ConfigService"
import type { AIProvider, AnalysisMode, MacroCategory } from "~types"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { I18nService } from "./I18nService"
import { ConsistencyService } from "./ConsistencyService"
import { StructuredOutputService } from "./StructuredOutputService"
import { buildSystemPrompt, getParserInstructions } from "./LLMPromptBuilder"
import { normalizeAndFixResponse } from "./LLMResponseNormalizer"
import { normalizeLabelId } from "./LLMLabelNormalizer"
import { withRetry, withTimeout } from "./LLMRetry"
import { Logger } from "./Logger"

const isLocalBaseUrl = (baseUrl?: string): boolean => {
  if (!baseUrl) return false;
  try {
    const url = new URL(baseUrl);
    const host = url.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch (e) {
    return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1") || baseUrl.includes("0.0.0.0");
  }
};

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
  generateProfile(text: string, mode: AnalysisMode, category: MacroCategory): Promise<LLMResponse>;
  generateRawText(prompt: string): Promise<string>;
}

export class LLMService {
  // Public this method to get parser instructions
  public static getParserInstructions(mode: AnalysisMode): string {
    return getParserInstructions(mode);
  }

  // 公开此方法以便在 generateProfile 中获取并打印
  public static getSystemPrompt(mode: AnalysisMode, category: MacroCategory, inputText?: string): string {
    return buildSystemPrompt(mode, category, inputText);
  }

  static async generateProfile(text: string, category: MacroCategory): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    this.ensureProviderConfigured(config.selectedProvider, config);
    
    // 对输入文本进行清理，防止触发内容过滤器
    const sanitizedText = this.sanitizeInputText(text);
    
    // 这里的日志现在会更详细
    if (config.enableDebug) {
      Logger.info("【LANGCHAIN REQUEST】Mode:", config.analysisMode || 'balanced');
      Logger.info("【LANGCHAIN REQUEST】Original text:", text);
      Logger.info("【LANGCHAIN REQUEST】Sanitized text:", sanitizedText);
      // 注意：这里我们不直接调用 getSystemPrompt，因为那是私有的或者静态的，
      // 但我们在 Provider 内部会调用它。为了调试，我们可以在 Provider 内部打印。
    }
    
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(sanitizedText, config.analysisMode || 'balanced', category)
  }

  static normalizeLabelId(labelId: string): string {
    return normalizeLabelId(labelId);
  }

  public static normalizeAndFixResponse(response: string): string {
    return normalizeAndFixResponse(response);
  }

  static async generateProfileForPlatform(text: string, category: MacroCategory, platform: string): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    this.ensureProviderConfigured(config.selectedProvider, config);
    
    // Use platform-specific analysis mode if available, otherwise fallback to default
    const mode = config.platformAnalysisModes?.[platform] || config.analysisMode || 'balanced';
    
    if (config.enableDebug) {
      console.log(`【LANGCHAIN REQUEST】Platform: ${platform}, Mode: ${mode}`);
    }
    
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(text, mode, category)
  }

  static async generateRawText(prompt: string): Promise<string> {
    const config = await ConfigService.getConfig();
    this.ensureProviderConfigured(config.selectedProvider, config);
    const provider = this.getProviderInstance(config.selectedProvider, config);
    return provider.generateRawText(prompt);
  }

  // Sanitize text to remove potentially problematic content
  private static sanitizeInputText(text: string): string {
    let sanitized = text;

    // Define a dictionary of sensitive words and their replacements
    const sensitiveWords = {
      // Geopolitical
      "台湾": "TW", "香港": "HK", "澳门": "MO", "西藏": "XZ", "新疆": "XJ", "独立": "independence", "统一": "reunification",
      "共产党": "CCP", "国民党": "KMT", "民进党": "DPP", "习近平": "XI", "蔡英文": "TSAI", "普京": "Putin", "泽连斯基": "Zelenskyy",
      "法轮功": "FLG", "达赖喇嘛": "Dalai Lama", "天安门": "Tiananmen", "六四": "64", "8964": "8964",
      "维吾尔": "Uygur", "集中营": "camp", "种族灭绝": "genocide", "镇压": "suppression",
      "反送中": "Anti-Extradition Bill Movement", "光复香港": "Liberate HK", "时代革命": "Revolution of Our Times",
      "香港警察": "HK Police", "黑警": "black police",
      "巴勒斯坦": "Palestine", "以色列": "Israel", "哈马斯": "Hamas", "加沙": "Gaza",
      "乌克兰": "Ukraine", "俄罗斯": "Russia", "战争": "war", "入侵": "invasion",

      // Social/Political
      "民主": "democracy", "自由": "freedom", "人权": "human rights", "独裁": "dictatorship", "专制": "autocracy",
      "革命": "revolution", "抗议": "protest", "示威": "demonstration", "游行": "march",
      "审查": "censorship", "防火墙": "GFW", "翻墙": "circumvention",
      "女权": "feminism", "男权": "masculinism", "LGBT": "LGBT", "同性恋": "homosexuality", "跨性别": "transgender",
      "白左": "white left", "左派": "leftist", "右派": "rightist", "白右": "white right",
      "躺平": "lying flat", "内卷": "involution", "润": "run",
      "疫情": "pandemic", "病毒": "virus", "清零": "zero-COVID",

      // Slurs/Insults (replace with neutral placeholders)
      "傻逼": "[insult]", "脑残": "[insult]", "支那": "[slur]", "粉红": "[political label]", "美分": "[political label]",
      "公知": "[intellectual]", "五毛": "[commentator]", "战狼": "[nationalist]",
      "尼哥": "[slur]", "黑鬼": "[slur]",

      // English sensitive words
      "nigger": "[slur]", "nigga": "[slur]", "chink": "[slur]", "gook": "[slur]",
      "genocide": "mass killing", "dictator": "leader", "regime": "government",
      "Uyghur": "Uygur", "Tibet": "XZ", "Xinjiang": "XJ", "Hong Kong": "HK", "Taiwan": "TW",
      "Falun Gong": "FLG", "Tiananmen Square": "Tiananmen", "June 4th": "64",
      "CCP": "Party", "communism": "ideology", "socialism": "ideology",
      "separatism": "separatism", "terrorism": "extremism",
      "assassination": "killing", "massacre": "mass killing",
      "revolution": "upheaval", "protest": "demonstration", "riot": "unrest",
      "censorship": "content moderation", "Great Firewall": "GFW",
      "feminism": "gender equality movement", "LGBTQ": "LGBTQ", "gay": "homosexual", "lesbian": "homosexual", "transgender": "trans",
      "woke": "progressive", "SJW": "social activist",
      "MAGA": "MAGA", "Trump": "Trump", "Biden": "Biden", "democrat": "democrat", "republican": "republican"
    };

    // Create a regex pattern to find all occurrences of the sensitive words
    const pattern = new RegExp(Object.keys(sensitiveWords).join("|"), "gi");

    // Replace the words found
    sanitized = sanitized.replace(pattern, (matched) => {
      // Find the corresponding replacement, case-insensitively
      const lowerMatched = matched.toLowerCase();
      for (const key in sensitiveWords) {
        if (key.toLowerCase() === lowerMatched) {
          return sensitiveWords[key];
        }
      }
      return matched; // Should not happen with the current regex
    });

    // Remove repeated symbols that might trigger content filters
    sanitized = sanitized.replace(/([!?.])\1{2,}/g, '$1$1'); // Limit repeated punctuation

    // Remove some potentially sensitive patterns
    sanitized = sanitized.replace(/\b(password|passwd|pwd)\s*[:=]\s*([^\s]+)/gi, '[REDACTED]');
    sanitized = sanitized.replace(/\b(token|secret|key)\s*[:=]\s*([^\s]+)/gi, '[REDACTED]');

    // Remove potential code injection patterns
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[SCRIPT REMOVED]');
    sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '[IFRAME REMOVED]');

    // Replace some common offensive patterns with safer alternatives
    sanitized = sanitized.replace(/\b(f[u]+ck?|s[h]+it|c[u]+nt)\b/gi, '***');

    // Truncate if too long (some providers have length limits)
    if (sanitized.length > 50000) {
      sanitized = sanitized.substring(0, 50000);
    }

    return sanitized;
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

  private static ensureProviderConfigured(type: AIProvider, config: any): void {
    if (type === "ollama") return;

    const apiKey = config.apiKeys?.[type];
    const baseUrl = config.customBaseUrls?.[type];
    const localBaseUrl = isLocalBaseUrl(baseUrl);

    if (!apiKey && !localBaseUrl) {
      const error = new Error(I18nService.t('error_missing_api_key'));
      (error as any).isMissingApiKey = true;
      throw error;
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
    const timeout = 600000; // 10 minutes timeout for LangChain

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
          timeout: timeout
          // Removed response_format: { type: "json_object" } since we're using structured output parser
        });
        this.rawLlm = new ChatOpenAI({
          openAIApiKey: this.apiKey,
          configuration: { baseURL: this.baseUrl },
          modelName: this.model,
          timeout: timeout,
          temperature: 0 // For classification, we want deterministic output
        });
        break;
      case "gemini":
        this.llm = new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          modelName: this.model,
          temperature: temperature
          // Removed responseMimeType: "application/json" since we're using structured output parser
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

  async generateProfile(text: string, mode: AnalysisMode, category: MacroCategory): Promise<LLMResponse> {
    if (!this.apiKey && !isLocalBaseUrl(this.baseUrl)) {
      throw new Error("API Key is required")
    }

    const startTime = Date.now();
    
    try {
      const timeout = 600000; // 10 minutes
      const maxRetries = 1;
      const systemPrompt = LLMService.getSystemPrompt(mode, category, text);

      // 增强日志：打印完整的 System Prompt
      const config = await ConfigService.getConfig();
      if (config.enableDebug) {
        Logger.info("【LANGCHAIN SYSTEM PROMPT】", systemPrompt);
        Logger.info("【LANGCHAIN USER INPUT】", text);
      }

      const parser = StructuredOutputService.getParserForMode(mode);
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(text)
      ];
      const chain = RunnableSequence.from([
        () => messages,
        this.llm,
        parser
      ]);

      const result = await withRetry(
        async (attempt) => {
          try {
            return await withTimeout(chain.invoke({}), timeout);
          } catch (error: any) {
            Logger.error(`LangChain API Error (attempt ${attempt + 1}):`, error);

            if (error.message && error.message.includes('400') && error.message.includes('Input data may contain inappropriate content')) {
              const userFriendlyError = new Error(I18nService.t('error_content_filter'));
              (userFriendlyError as any).isContentFilter = true;
              throw userFriendlyError;
            }

            if (attempt === 0 && this.shouldRetryOnError(error)) {
              Logger.warn("Attempting error correction with feedback...");
              const corrected = await this.retryWithErrorFeedback(text, mode, category, error.message);
              if (corrected) {
                return corrected;
              }
            }

            throw error;
          }
        },
        {
          retries: maxRetries,
          baseDelayMs: 500,
          shouldRetry: (error) => this.shouldRetryOnError(error)
        }
      );
      
      const durationMs = Date.now() - startTime;

      // Since we're using structured parser, result should already be the parsed object
      let parsedContent = result;
      
      // Normalize labels and deduplicate
      if (parsedContent.value_orientation && Array.isArray(parsedContent.value_orientation)) {
        const labelMap = new Map<string, number>();
        
        parsedContent.value_orientation.forEach((item: any) => {
            const normalizedLabel = LLMService.normalizeLabelId(item.label);
            const currentScore = item.score;
            
            // If duplicate, keep the one with stronger signal (higher absolute score)
            if (labelMap.has(normalizedLabel)) {
                const existingScore = labelMap.get(normalizedLabel)!;
                if (Math.abs(currentScore) > Math.abs(existingScore)) {
                    labelMap.set(normalizedLabel, currentScore);
                }
            } else {
                labelMap.set(normalizedLabel, currentScore);
            }
        });
        
        parsedContent.value_orientation = Array.from(labelMap.entries()).map(([label, score]) => ({
            label,
            score
        }));
      }
      
      // Apply consistency check to ensure evidence aligns with value orientation scores
      // But only fix evidence, not summary
      const consistentProfile = {
        ...parsedContent,
        evidence: ConsistencyService.validateAndFixEvidenceConsistency(parsedContent).evidence
      };
      
      if (config.enableDebug) {
        Logger.info("【LANGCHAIN LABEL SCORES】LLM Scores：", consistentProfile.value_orientation);
        Logger.info("【CONSISTENCY REPORT】", ConsistencyService.generateConsistencyReport(consistentProfile));
      }
      
      return {
          content: consistentProfile,
          usage: undefined,
          durationMs,
          model: this.model || "unknown"
      }
    } catch (error: any) {
      // 如果是内容过滤错误，直接返回特定响应
      if (error.isContentFilter) {
        const defaultResponse = {
          nickname: "",
          topic_classification: "Content Analysis",
          value_orientation: [],
          summary: error.message,
          evidence: []
        };
        
        const durationMs = Date.now() - startTime;
        return {
          content: defaultResponse,
          usage: undefined,
          durationMs,
          model: this.model || "unknown"
        };
      }

      Logger.error("LangChain API Error:", error);
      // 其他错误保持原有逻辑
      if (error.message && (error.message.includes('inappropriate content') || error.message.includes('data_inspection_failed'))) {
        const defaultResponse = {
          nickname: "",
          topic_classification: "Content Analysis",
          value_orientation: [],
          summary: "Content Safety Review Failed: The content may involve sensitive topics and was blocked by the AI provider. Please try switching to DeepSeek or OpenAI models.",
          evidence: []
        };
        
        const durationMs = Date.now() - startTime;
        return {
          content: defaultResponse,
          usage: undefined,
          durationMs,
          model: this.model || "unknown"
        };
      }
      
      throw error;
    }
  }
  
  // 判断是否应该基于错误进行重试
  private shouldRetryOnError(error: any): boolean {
    // 如果是格式错误、解析错误或结构验证错误，则进行重试
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('parse') || 
      errorMessage.includes('format') || 
      errorMessage.includes('schema') ||
      errorMessage.includes('structure') ||
      errorMessage.includes('validation')
    );
  }
  
  // 基于错误反馈进行重试
  private async retryWithErrorFeedback(text: string, mode: AnalysisMode, category: MacroCategory, errorMessage: string): Promise<any> {
    const systemPrompt = LLMService.getSystemPrompt(mode, category, text);
    
    // 构造错误反馈提示
    const errorFeedbackPrompt = `Previous attempt failed with the following error:
    
"${errorMessage}"

The output did not match the required JSON structure. Please ensure your response strictly follows the format instructions provided below and return ONLY the JSON object without any other text or markdown formatting:

${LLMService.getParserInstructions(mode)}

Now, please analyze the following text again:` + "\n\n" + text;
    
    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(errorFeedbackPrompt)
      ];
      
      const chain = RunnableSequence.from([
        () => messages,
        this.llm
      ]);
      
      const result = await chain.invoke({});
      
      // 再次尝试解析
      const parser = StructuredOutputService.getParserForMode(mode);
      return await parser.parse(result.content || result);
    } catch (e) {
      Logger.error("Error correction attempt failed:", e);
      return null;
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

  async generateProfile(text: string, mode: AnalysisMode, category: MacroCategory): Promise<LLMResponse> {
    const startTime = Date.now();
    const url = `${this.baseUrl}/api/generate`
    
    const prompt = LLMService.getSystemPrompt(mode, category, text) + "\n\n" + text;
    
    const config = await ConfigService.getConfig();
    if (config.enableDebug) {
      Logger.info("【LANGCHAIN REQUEST】Sending to LLM:", prompt);
    }
    
    const timeout = 600000; // 10 minutes
    const maxRetries = 1;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const data = await withRetry(
        async (attempt) => {
          const response = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Connection": "keep-alive"
            },
            body: JSON.stringify({
              model: this.model,
              prompt: prompt,
              format: "json", 
              stream: false,
              options: {
                temperature: mode === 'fast' ? 0.3 : 0.5,
                num_predict: mode === 'fast' ? 512 : 1024
              }
            }),
            signal: controller.signal
          })
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            Logger.error(`Ollama API Error (attempt ${attempt + 1}): ${response.status}`, errorText);
            
            if (errorText.includes('inappropriate') || errorText.includes('data_inspection_failed')) {
              const defaultResponse = {
                nickname: "",
                topic_classification: "Content Analysis",
                value_orientation: [],
                summary: "Content Safety Review Failed: the content may involve sensitive topics and was blocked by the AI provider. Please try switching to DeepSeek or OpenAI models.",
                evidence: []
              };
              
              const durationMs = Date.now() - startTime;
              return {
                _earlyReturn: {
                  content: defaultResponse,
                  usage: undefined,
                  durationMs,
                  model: this.model
                }
              };
            }
            
            const error = new Error(`Ollama API Error: ${response.status} - ${errorText}`);
            (error as any).status = response.status;
            throw error;
          }

          return await response.json();
        },
        {
          retries: maxRetries,
          baseDelayMs: 500,
          shouldRetry: (error) => {
            if (error?.name === 'AbortError') return true;
            const status = error?.status;
            return typeof status === 'number' && status >= 500;
          }
        }
      );

      if ((data as any)?._earlyReturn) {
        return (data as any)._earlyReturn;
      }

      const durationMs = Date.now() - startTime;
      const usage = {
          prompt_tokens: data.prompt_eval_count,
          completion_tokens: data.eval_count,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      };

      if (config.enableDebug) {
        Logger.info("【LANGCHAIN RESPONSE】LLM JSON:", data.response);
      }

      const content = data.response || "{}";
      const validatedContent = LLMService.normalizeAndFixResponse(content);
      const parsedContent = JSON.parse(validatedContent);
      
      // Normalize labels and deduplicate
      if (parsedContent.value_orientation && Array.isArray(parsedContent.value_orientation)) {
        const labelMap = new Map<string, number>();
        
        parsedContent.value_orientation.forEach((item: any) => {
            const normalizedLabel = LLMService.normalizeLabelId(item.label);
            const currentScore = item.score;
            
            // If duplicate, keep the one with stronger signal (higher absolute score)
            if (labelMap.has(normalizedLabel)) {
                const existingScore = labelMap.get(normalizedLabel)!;
                if (Math.abs(currentScore) > Math.abs(existingScore)) {
                    labelMap.set(normalizedLabel, currentScore);
                }
            } else {
                labelMap.set(normalizedLabel, currentScore);
            }
        });
        
        parsedContent.value_orientation = Array.from(labelMap.entries()).map(([label, score]) => ({
            label,
            score
        }));
      }
      
      // Apply consistency check to ensure evidence aligns with value orientation scores
      // But only fix evidence, not summary
      const consistentProfile = {
        ...parsedContent,
        evidence: ConsistencyService.validateAndFixEvidenceConsistency(parsedContent).evidence
      };
      
      const debugConfig = await ConfigService.getConfig();
      if (debugConfig.enableDebug) {
        Logger.info("【LANGCHAIN LABEL SCORES】LLM Scores:", consistentProfile.value_orientation);
        Logger.info("【CONSISTENCY REPORT】", ConsistencyService.generateConsistencyReport(consistentProfile));
      }
      
      return {
          content: consistentProfile,
          usage,
          durationMs,
          model: this.model
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timeout');
      }
      throw error;
    }
  }
  
  
}



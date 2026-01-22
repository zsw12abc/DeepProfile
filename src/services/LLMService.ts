import { ConfigService } from "./ConfigService"
import type { AIProvider, AnalysisMode, MacroCategory } from "~types"
import { LabelService } from "./LabelService"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"
import { TopicService } from "./TopicService"
import { I18nService } from "./I18nService"
import { ConsistencyService } from "./ConsistencyService"
import { StructuredOutputService } from "./StructuredOutputService"
import { ExampleService } from "./ExampleService"

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
    return StructuredOutputService.getFormatInstructions(mode);
  }

  // 公开此方法以便在 generateProfile 中获取并打印
  public static getSystemPrompt(mode: AnalysisMode, category: MacroCategory, inputText?: string): string {
    // Refresh label cache to ensure language is up-to-date
    const labelService = LabelService.getInstance();
    labelService.refreshCategories();
    
    // OPTIMIZATION: Get core labels + relevant category labels
    // This ensures we always capture political/social values even in other topics
    const standardLabels = labelService.getLabelsForContext(category, mode);
    const categoryName = TopicService.getCategoryName(category);
    const isEn = I18nService.getLanguage() === 'en-US';
    
    // Get format instructions from structured parser
    const formatInstructions = LLMService.getParserInstructions(mode);

    // 获取与输入内容相关的动态示例
    const exampleService = ExampleService.getInstance();
    const dynamicExamples = inputText ? exampleService.getRelevantExamples(inputText, category, mode, 2) : [];
    const dynamicFewShotExamples = dynamicExamples.length > 0 
      ? exampleService.formatExamplesAsPrompt(dynamicExamples, mode)
      : (isEn ? `
【Few-Shot Examples】
Text: "The government should stop regulating the market so much. Let businesses compete freely, and the economy will grow."
Analysis:
- market_vs_gov: 0.8 (Strongly favors market freedom over government intervention)
- competition_vs_equality: 0.6 (Favors competition)

Text: "We need to protect our traditional values. All these new woke ideas are destroying our family structure."
Analysis:
- change: -0.9 (Strongly conservative/traditional)
- feminism_vs_patriarchy: -0.5 (Likely favors traditional family roles)
` : `
【Few-Shot Examples】
文本: "政府管得太多了，应该让市场自由竞争，经济才能好起来。"
分析:
- market_vs_gov: 0.8 (强烈倾向于市场自由，反对政府干预)
- competition_vs_equality: 0.6 (倾向于竞争)

文本: "现在的年轻人太不像话了，我们需要回归传统价值观，保护我们的家庭结构。"
分析:
- change: -0.9 (强烈保守/传统)
- feminism_vs_patriarchy: -0.5 (倾向于传统家庭角色)
`);

    if (mode === 'fast') {
      // 快速模式：保持原样，追求速度，无思维链
      return `You are a sociology researcher conducting an academic study on internet subcultures and public values. Please objectively analyze the author's value orientation based on the provided text materials.

${formatInstructions}

【Instructions】
1. Current Research Field: 【${categoryName}】. If the content is completely unrelated to this field, please state so in the summary and return an empty value_orientation.
2. Please use academic and neutral language for description.
3. Please select the most matching labels from the Standard Label Library below based on the content.
4. Must use the 【Label ID】 defined in the library (e.g., 'ideology'), strictly forbidden to use translated names.
5. Scoring Standard: 1.0 represents a strong tendency towards the right-side description of the label, -1.0 represents a strong tendency towards the left-side description.
6. Output Language: ${isEn ? 'English' : 'Simplified Chinese'}.
7. Content Safety: If the input content contains sensitive information, please analyze the user's value orientation based on their expression style, language habits, and topic preferences, without directly repeating sensitive content.
8. CRITICAL CONSISTENCY RULE: The summary should reflect the user's overall personality, writing style, and expressed opinions naturally. Do NOT include explicit statements about specific label scores (e.g., "the user shows X% tendency toward..."). The summary should organically reflect the user's value orientations without stating them directly.

${dynamicFewShotExamples}

【Standard Label Library】
${standardLabels}
`;
    } else {
      // 平衡和深度模式：引入思维链 (reasoning 字段)
      let basePrompt = `You are a sociology researcher conducting an academic study on internet subcultures and public values. Please objectively analyze the author's value orientation based on the provided text materials.

${formatInstructions}

【Instructions】
1. 【Relevance Judgment】 Current Research Field: 【${categoryName}】. If the content is completely unrelated to this field, please state so in the summary and return an empty value_orientation.
2. 【Chain of Thought】 You MUST fill the "reasoning" field first. Briefly analyze the rhetoric, tone, and underlying logic before assigning scores. This ensures accuracy.
3. 【Objective Neutrality】 Please use academic and neutral language for description, avoiding radical or emotional vocabulary.
4. 【Label Selection】 Please select the most matching labels from the Standard Label Library below based on the content.
5. 【ID Constraint】 Must use the 【Label ID】 defined in the library (e.g., 'ideology'), strictly forbidden to use translated names.
6. 【Scoring Standard】 1.0 represents a strong tendency towards the right-side description of the label, -1.0 represents a strong tendency towards the left-side description.
7. 【Output Language】 The output content (summary, analysis, etc.) MUST be in ${isEn ? 'English' : 'Simplified Chinese'}.
8. 【Content Safety】 If the input content contains sensitive information, please analyze the user's value orientation based on their expression style, language habits, and topic preferences, without directly repeating sensitive content.
9. 【CRITICAL CONSISTENCY RULE】 The summary should reflect the user's overall personality, writing style, and expressed opinions naturally. Do NOT include explicit statements about specific label scores (e.g., "the user shows X% tendency toward..."). The summary should organically reflect the user's value orientations without stating them directly.

${dynamicFewShotExamples}

【Standard Label Library】
${standardLabels}
`;

      if (mode === 'deep') {
          basePrompt += `\n【Deep Mode】: Please deeply analyze the rhetoric, metaphors, and underlying logic in the text. The "reasoning" field should be more detailed.`;
      }

      return basePrompt;
    }
  }

  static async generateProfile(text: string, category: MacroCategory): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    
    // 这里的日志现在会更详细
    if (config.enableDebug) {
      console.log("【LANGCHAIN REQUEST】Mode:", config.analysisMode || 'balanced');
      // 注意：这里我们不直接调用 getSystemPrompt，因为那是私有的或者静态的，
      // 但我们在 Provider 内部会调用它。为了调试，我们可以在 Provider 内部打印。
    }
    
    const provider = this.getProviderInstance(config.selectedProvider, config)
    return provider.generateProfile(text, config.analysisMode || 'balanced', category)
  }

  static async generateProfileForPlatform(text: string, category: MacroCategory, platform: string): Promise<LLMResponse> {
    const config = await ConfigService.getConfig()
    
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
    if (!this.apiKey && !this.baseUrl?.includes("localhost")) {
      throw new Error("API Key is required")
    }

    const startTime = Date.now();
    
    try {
      const timeout = 600000; // 10 minutes
      
      const systemPrompt = LLMService.getSystemPrompt(mode, category, text);
      
      // 增强日志：打印完整的 System Prompt
      const config = await ConfigService.getConfig();
      if (config.enableDebug) {
        console.log("【LANGCHAIN SYSTEM PROMPT】", systemPrompt);
        console.log("【LANGCHAIN USER INPUT】", text);
      }
      
      // Create structured output parser based on mode
      const parser = StructuredOutputService.getParserForMode(mode);
      
      // Create the chain with prompt -> LLM -> Parser
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(text)
      ];
      
      // Create a runnable sequence with the parser
      const chain = RunnableSequence.from([
        () => messages,
        this.llm,
        parser
      ]);
      
      // 尝试最多两次生成，如果第一次失败则进行错误反馈重试
      let result = null;
      let attempt = 0;
      let lastError = null;
      
      while (attempt < 2) {
        try {
          result = await Promise.race([
            chain.invoke({}),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('LLM request timeout')), timeout)
            )
          ]);
          break; // 成功则退出循环
        } catch (error: any) {
          lastError = error;
          console.error(`LangChain API Error (attempt ${attempt + 1}):`, error);
          
          // 如果是第一次失败且错误是格式相关，尝试错误反馈重试
          if (attempt === 0 && this.shouldRetryOnError(error)) {
            console.log("Attempting error correction with feedback...");
            result = await this.retryWithErrorFeedback(text, mode, category, error.message);
            
            if (result) {
              break; // 重试成功则退出循环
            }
          }
          
          attempt++;
        }
      }
      
      // 如果多次尝试都失败，抛出最后一次错误
      if (result === null) {
        throw lastError;
      }
      
      const durationMs = Date.now() - startTime;

      // Since we're using structured parser, result should already be the parsed object
      let parsedContent = result;
      
      // Apply consistency check to ensure evidence aligns with value orientation scores
      // But only fix evidence, not summary
      const consistentProfile = {
        ...parsedContent,
        evidence: ConsistencyService.validateAndFixEvidenceConsistency(parsedContent).evidence
      };
      
      if (config.enableDebug) {
        console.log("【LANGCHAIN LABEL SCORES】LLM Scores：", consistentProfile.value_orientation);
        console.log("【CONSISTENCY REPORT】", ConsistencyService.generateConsistencyReport(consistentProfile));
      }
      
      return {
          content: consistentProfile,
          usage: undefined,
          durationMs,
          model: this.model || "unknown"
      }
    } catch (error: any) {
      console.error("LangChain API Error:", error);
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
      
      if (error.message && error.message.includes('400') && error.message.includes('Output data may contain inappropriate content')) {
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
      console.error("Error correction attempt failed:", e);
      return null;
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
        parsed.value_orientation = parsed.value_orientation.map((item: any) => {
          if (typeof item === 'string') {
            return { label: normalizeLabelId(item.trim()), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score));
            return { label: normalizeLabelId(String(item.label).trim()), score };
          }
          return { label: "Unknown", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      return JSON.stringify({
        nickname: "",
        topic_classification: "Unknown",
        value_orientation: [],
        summary: "Analysis Failed",
        evidence: []
      }, null, 2);
    }
    
    // Normalize label IDs to ensure they match our standard definitions
    function normalizeLabelId(labelId: string): string {
      // Handle common variations that AI might return
      const labelVariations: Record<string, string> = {
        // Individualism vs Collectivism variations
        'collectivism_vs_individualism': 'individualism_vs_collectivism',
        'individualism_collectivism': 'individualism_vs_collectivism',
        'collectivism_individualism': 'individualism_vs_collectivism',
        'individual_collective': 'individualism_vs_collectivism',
        
        // Ideology variations
        'left_right': 'ideology',
        'ideology_left_right': 'ideology',
        'left_vs_right': 'ideology',
        'right_vs_left': 'ideology',
        
        // Authority/Liberty variations
        'authority_freedom': 'authority',
        'freedom_authority': 'authority',
        'libertarian_authoritarian': 'authority',
        'authoritarian_libertarian': 'authority',
        'liberty_order': 'authority',
        'order_liberty': 'authority',
        
        // Change/Tradition variations
        'traditional_progressive': 'change',
        'progressive_traditional': 'change',
        'progressive_traditional': 'change',
        'traditional_progressive': 'change',
        'change_tradition': 'change',
        'tradition_change': 'change',
        
        // Market vs Government variations
        'market_government': 'market_vs_gov',
        'government_market': 'market_vs_gov',
        'market_state': 'market_vs_gov',
        'state_market': 'market_vs_gov',
        
        // Elite vs Grassroots variations
        'elite_grassroots': 'elite_vs_grassroots',
        'grassroots_elite': 'elite_vs_grassroots',
        'elite_people': 'elite_vs_grassroots',
        'people_elite': 'elite_vs_grassroots',
        
        // Feminism vs Patriarchy variations
        'feminism_patriarchy': 'feminism_vs_patriarchy',
        'patriarchy_feminism': 'feminism_vs_patriarchy',
        'gender_equality_tradition': 'feminism_vs_patriarchy',
        'tradition_gender_equality': 'feminism_vs_patriarchy',
        
        // Urban vs Rural variations
        'urban_rural': 'urban_vs_rural',
        'rural_urban': 'urban_vs_rural',
        
        // Generational conflict variations
        'generational_conflict_left_right': 'generational_conflict',
        'left_generational_conflict': 'generational_conflict',
        'right_generational_conflict': 'generational_conflict',
        'gen_z_boomer': 'generational_conflict',
        'boomer_gen_z': 'generational_conflict',
        
        // Open vs Closed variations
        'open_closed': 'open_vs_closed',
        'closed_open': 'open_vs_closed',
        
        // Innovation vs Security variations
        'innovation_security': 'innovation_vs_security',
        'security_innovation': 'innovation_vs_security',
        
        // Tech optimism variations
        'tech_optimism_pessimism': 'optimism_vs_conservatism',
        'optimism_pessimism_tech': 'optimism_vs_conservatism',
        'tech_pessimism_optimism': 'optimism_vs_conservatism',
        
        // Decentralization variations
        'decentralization_centralization': 'decentralization_vs_centralization',
        'centralization_decentralization': 'decentralization_vs_centralization',
        
        // Local vs Global variations
        'local_global': 'local_vs_global',
        'global_local': 'local_vs_global',
        'globalization_nationalism': 'local_vs_global',
        'nationalism_globalization': 'local_vs_global',
        
        // Spiritual vs Material variations
        'spiritual_material': 'spiritual_vs_material',
        'material_spiritual': 'spiritual_vs_material',
        
        // Serious vs Popular variations
        'serious_popular': 'serious_vs_popular',
        'popular_serious': 'serious_vs_popular',
        
        // Secular vs Religious variations
        'secular_religious': 'secular_vs_religious',
        'religious_secular': 'secular_vs_religious',
        
        // Protection vs Development variations
        'protection_development': 'protection_vs_development',
        'development_protection': 'protection_vs_development',
        
        // Climate belief variations
        'climate_believer_skeptic': 'climate_believer_vs_skeptic',
        'skeptic_believer_climate': 'climate_believer_vs_skeptic',
        
        // 2D vs 3D variations
        '2d_3d': '2d_vs_3d',
        '3d_2d': '2d_vs_3d',
        
        // Hardcore vs Casual variations
        'hardcore_casual': 'hardcore_vs_casual',
        'casual_hardcore': 'hardcore_vs_casual',
        
        // Niche vs Mainstream variations
        'niche_mainstream': 'niche_vs_mainstream',
        'mainstream_niche': 'niche_vs_mainstream',
        
        // Frugal vs Luxury variations
        'frugal_luxury': 'frugal_vs_luxury',
        'luxury_frugal': 'frugal_vs_luxury',
        
        // Stable vs Risk variations
        'stable_risk': 'stable_vs_risk',
        'risk_stable': 'stable_vs_risk',
        
        // Cat vs Dog variations
        'cat_dog': 'cat_vs_dog',
        'dog_cat': 'cat_vs_dog',
        
        // Family vs Single variations
        'family_single': 'family_vs_single',
        'single_family': 'family_vs_single',
        
        // Discipline vs Hedonism variations
        'discipline_hedonism': 'discipline_vs_hedonism',
        'hedonism_discipline': 'discipline_vs_hedonism',
        
        // Competition vs Equality variations
        'competition_equality': 'competition_vs_equality',
        'equality_competition': 'competition_vs_equality',
        
        // Speculation vs Value variations
        'speculation_value': 'speculation_vs_value',
        'value_speculation': 'speculation_vs_value',
        
        // Micro vs Macro variations
        'micro_macro': 'micro_vs_macro',
        'macro_micro': 'micro_vs_macro',
        
        // Real vs Virtual variations
        'real_virtual': 'real_vs_virtual',
        'virtual_real': 'real_vs_virtual',
        
        // Capital vs Labor variations
        'capital_labor': 'capital_vs_labor',
        'labor_capital': 'capital_vs_labor',
        
        // Geopolitics variations
        'globalism_nationalism': 'geopolitics',
        'nationalism_globalism': 'geopolitics',
        'internationalism_isolationism': 'geopolitics',
        'isolationism_internationalism': 'geopolitics',
        
        // Radicalism variations
        'radical_moderate': 'radicalism',
        'moderate_radical': 'radicalism',
        
        // Establishment variations
        'establishment_populist': 'establishment',
        'populist_establishment': 'establishment',
        
        // Work vs Life variations
        'work_life': 'work_vs_life',
        'life_work': 'work_vs_life',
        
        // Conformity vs Individuality variations
        'conformity_vs_individuality': 'conformity_vs_individuality',
        'individuality_vs_conformity': 'conformity_vs_individuality',
        'conformity_individuality': 'conformity_vs_individuality',
        'individuality_conformity': 'conformity_vs_individuality'
      };
      
      // Return normalized ID if found, otherwise return original
      return labelVariations[labelId.toLowerCase()] || labelId;
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
      console.log("【LANGCHAIN REQUEST】Sending to LLM:", prompt);
    }
    
    const timeout = 600000; // 10 minutes
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
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
        console.error(`Ollama API Error: ${response.status}`, errorText);
        
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
            content: defaultResponse,
            usage: undefined,
            durationMs,
            model: this.model
          };
        }
        
        throw new Error(`Ollama API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const durationMs = Date.now() - startTime;
      const usage = {
          prompt_tokens: data.prompt_eval_count,
          completion_tokens: data.eval_count,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      };

      if (config.enableDebug) {
        console.log("【LANGCHAIN RESPONSE】LLM JSON:", data.response);
      }

      const content = data.response || "{}";
      const validatedContent = this.validateAndFixResponse(content);
      const parsedContent = JSON.parse(validatedContent);
      
      // Apply consistency check to ensure evidence aligns with value orientation scores
      // But only fix evidence, not summary
      const consistentProfile = {
        ...parsedContent,
        evidence: ConsistencyService.validateAndFixEvidenceConsistency(parsedContent).evidence
      };
      
      const debugConfig = await ConfigService.getConfig();
      if (debugConfig.enableDebug) {
        console.log("【LANGCHAIN LABEL SCORES】LLM Scores:", consistentProfile.value_orientation);
        console.log("【CONSISTENCY REPORT】", ConsistencyService.generateConsistencyReport(consistentProfile));
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
        parsed.value_orientation = parsed.value_orientation.map((item: any) => {
          if (typeof item === 'string') {
            return { label: item.trim(), score: 0.5 };
          } else if (typeof item === 'object' && item.label) {
            let score = item.score || 0.5;
            score = Math.max(-1, Math.min(1, score));
            return { label: String(item.label).trim(), score };
          }
          return { label: "Unknown", score: 0.5 };
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Response validation error:", e, "Raw response:", response);
      return JSON.stringify({
        nickname: "",
        topic_classification: "Unknown",
        value_orientation: [],
        summary: "Analysis Failed",
        evidence: []
      }, null, 2);
    }
  }
}
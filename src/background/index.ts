import { LLMService } from "../services/LLMService"
import { ZhihuClient } from "../services/ZhihuClient"
import { ConfigService } from "../services/ConfigService"
import { ProfileService } from "../services/ProfileService"
import { HistoryService } from "../services/HistoryService"
import { TopicService } from "../services/TopicService"
import { CommentAnalysisService } from "../services/CommentAnalysisService"
import { I18nService } from "../services/I18nService"
import { LabelService } from "../services/LabelService"
import type { SupportedPlatform } from "../types"

export {}

console.log("DeepProfile Background Service Started")

// Initialize I18n
I18nService.init();

// Open options page on install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    chrome.runtime.openOptionsPage();
  }
});

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_PROFILE") {
    const tabId = sender.tab?.id
    
    handleAnalysis(request.userId, request.context, tabId, request.platform, request.forceRefresh)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep the message channel open for async response
  }

  if (request.type === "ANALYZE_COMMENTS") {
      // 如果有 answerId，先获取回答内容
      const analyzeWithContext = async () => {
          let contextTitle = request.contextTitle;
          let contextContent = request.contextContent;
          
          // 如果前端没有提取到内容，但提供了 answerId，则尝试从 API 获取
          if (!contextContent && request.answerId) {
              try {
                  const answerContent = await ZhihuClient.fetchAnswerContentForContext(request.answerId);
                  if (answerContent) {
                      // 截取一部分内容作为上下文，避免过长
                      contextContent = answerContent.replace(/<[^>]*>?/gm, '').slice(0, 1000);
                  }
              } catch (e) {
                  console.warn("Failed to fetch answer content for context:", e);
              }
          }
          
          // 如果请求中包含语言设置，则更新 I18nService
          if (request.language) {
              I18nService.setLanguage(request.language);
          }
          
          return CommentAnalysisService.analyzeComments(request.comments, contextTitle, contextContent, request.platform);
      };

      analyzeWithContext()
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
  }
  
  if (request.type === "LIST_MODELS") {
    listModels(request.provider, request.apiKey, request.baseUrl)
      .then((models) => sendResponse({ success: true, data: models }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.type === "TEST_CONNECTION") {
    testConnection(request.provider, request.apiKey, request.baseUrl, request.model)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

async function testConnection(provider: string, apiKey: string, baseUrl: string, model: string): Promise<string> {
    try {
        const testPrompt = "Hello";
        let url = '';
        let body = {};
        let headers: any = { 'Content-Type': 'application/json' };

        if (provider === 'openai' || provider === 'deepseek' || provider === 'qwen' || provider === 'custom') {
            if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
            else if (provider === 'deepseek') url = 'https://api.deepseek.com/v1/chat/completions';
            else if (provider === 'qwen') url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
            else if (provider === 'custom') url = `${baseUrl}/chat/completions`;
            
            if (baseUrl && provider !== 'custom') url = `${baseUrl}/chat/completions`;

            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || (provider === 'qwen' ? 'qwen-turbo' : 'gpt-3.5-turbo'),
                messages: [{ role: 'user', content: testPrompt }],
                max_tokens: 5
            };
        } else if (provider === 'ollama') {
            url = `${baseUrl || 'http://localhost:11434'}/api/generate`;
            body = {
                model: model || 'llama3',
                prompt: testPrompt,
                stream: false
            };
        } else if (provider === 'gemini') {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
            body = {
                contents: [{ parts: [{ text: testPrompt }] }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            let friendlyMsg = `API Error (${response.status})`;
            
            if (response.status === 401) friendlyMsg = I18nService.t('error_401');
            else if (response.status === 402) friendlyMsg = I18nService.t('error_402');
            else if (response.status === 404) friendlyMsg = I18nService.t('error_404');
            else if (response.status === 429) friendlyMsg = I18nService.t('error_429');
            
            throw new Error(`${friendlyMsg} \nDetails: ${errText.slice(0, 100)}`);
        }

        return I18nService.t('connection_success');
    } catch (e: any) {
        throw e;
    }
}

async function listModels(provider: string, apiKey: string, baseUrl: string): Promise<string[]> {
    try {
        if (provider === 'openai' || provider === 'deepseek' || provider === 'qwen' || provider === 'custom') {
            let url = '';
            if (provider === 'openai') url = 'https://api.openai.com/v1/models';
            else if (provider === 'deepseek') url = 'https://api.deepseek.com/v1/models';
            else if (provider === 'qwen') url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/models';
            else if (provider === 'custom') url = `${baseUrl}/models`;
            
            if (baseUrl && provider !== 'custom') {
                url = `${baseUrl}/models`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(`Failed to fetch models: ${response.status} ${errText}`);
            }
            
            const data = await response.json();
            return data.data.map((m: any) => m.id).sort();
        } 
        else if (provider === 'ollama') {
            const url = `${baseUrl || 'http://localhost:11434'}/api/tags`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
            const data = await response.json();
            return data.models.map((m: any) => m.name).sort();
        }
        else if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
            const data = await response.json();
            return (data.models || [])
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: any) => m.name.replace('models/', ''))
                .sort();
        }
        return [];
    } catch (e: any) {
        console.error("List models error:", e);
        throw e;
    }
}

async function sendProgress(tabId: number | undefined, message: string) {
  if (tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "ANALYSIS_PROGRESS",
        message
      })
    } catch (e) {
      // Ignore if tab is closed or message fails
    }
  }
}

async function handleAnalysis(userId: string, context?: string, tabId?: number, platform: SupportedPlatform = 'zhihu', forceRefresh: boolean = false) {
  // Ensure I18n is initialized with current config
  await I18nService.init();
  
  // Refresh label cache to ensure language is up-to-date
  const labelService = LabelService.getInstance();
  labelService.refreshCategories();
  
  console.log(`Analyzing user: ${userId}, Platform: ${platform}, Context: ${context}, ForceRefresh: ${forceRefresh}`)
  const startTime = Date.now();
  
  // 1. Classify the context into a macro category
  let macroCategory = TopicService.classify(context || "");
  if (macroCategory === 'general') {
    console.log("Keyword classification failed, falling back to LLM classification...");
    await sendProgress(tabId, I18nService.t('analyzing') + "...");
    macroCategory = await TopicService.classifyWithLLM(context || "");
  }
  const categoryName = TopicService.getCategoryName(macroCategory);
  console.log(`Context classified as: ${macroCategory} (${categoryName})`);

  // 2. Check cache first (if not forced)
  if (!forceRefresh) {
    // Use macroCategory for cache lookup
    const cachedProfile = await HistoryService.getProfile(userId, platform, macroCategory);
    const userRecord = await HistoryService.getUserRecord(userId, platform);
    
    if (cachedProfile) {
      console.log(`Cache hit for user ${userId} in category ${macroCategory}`);
      await sendProgress(tabId, `${I18nService.t('history_record')} (${categoryName})`);
      
      return {
        profile: cachedProfile.profileData,
        items: [], 
        userProfile: userRecord?.userInfo || null, // Return cached user info if available
        fromCache: true,
        cachedAt: cachedProfile.timestamp,
        cachedContext: cachedProfile.context // Return the original context stored in cache
      };
    }
  }

  const config = await ConfigService.getConfig()
  const limit = config.analyzeLimit || 15

  await sendProgress(tabId, `${I18nService.t('analyzing')}...`)
  
  const userProfile = await ProfileService.fetchUserProfile(platform, userId)
  
  if (userProfile) {
      await sendProgress(tabId, `${I18nService.t('analyzing')} ${userProfile.name}...`)
  } else {
      await sendProgress(tabId, `${I18nService.t('analyzing')}...`)
  }

  const fetchResult = await ProfileService.fetchUserContent(platform, userId, limit, context)
  const items = fetchResult.items;
  
  if (!items || items.length === 0) {
    if (!userProfile) {
        throw new Error(I18nService.t('error_user_not_found'))
    }
  }

  await sendProgress(tabId, I18nService.t('wait_moment'))

  // --- Structured Context for LLM ---
  let contextForLLM = '';
  if (context) {
      const parts = context.split('|').map(s => s.trim());
      const title = parts[0];
      const tags = parts.slice(1);
      contextForLLM += `【Question】: ${title}\n`;
      if (tags.length > 0) {
          contextForLLM += `【Topics】: ${tags.join(', ')}\n\n`;
      }
  }

  let cleanText = ProfileService.cleanContentData(platform, items, userProfile)
  
  if (contextForLLM) {
      cleanText = contextForLLM + cleanText;
  }
  
  try {
      // Pass macroCategory (ID) to generateProfile for optimized prompting
      const llmResponse = await LLMService.generateProfileForPlatform(cleanText, macroCategory, platform)
      
      const totalDuration = Date.now() - startTime;

      // 3. Save to History using macroCategory
      await HistoryService.saveProfile(
        userId,
        platform,
        macroCategory, // Store macroCategory as the key
        llmResponse.content,
        context || "", // Store original context for reference
        llmResponse.model,
        userProfile ? {
            name: userProfile.name,
            headline: userProfile.headline,
            avatar_url: userProfile.avatar_url,
            url_token: userProfile.url_token
        } : undefined
      );

      let debugInfo = undefined;
      if (config.enableDebug) {
          const createdCount = items.filter(i => i.action_type === 'created').length;
          const votedCount = items.filter(i => i.action_type === 'voted').length;
          
          const sourceInfo = `Top ${items.length} of ${fetchResult.totalFetched} (Found ${fetchResult.totalRelevant} relevant)`;

          debugInfo = {
              totalDurationMs: totalDuration,
              llmDurationMs: llmResponse.durationMs,
              itemsCount: items.length,
              itemsBreakdown: `Created: ${createdCount}, Voted: ${votedCount}`,
              sourceInfo: sourceInfo,
              model: llmResponse.model,
              tokens: llmResponse.usage,
              context: context || "None",
              fetchStrategy: context ? `Context-Aware (Limit: ${limit})` : `Chronological (Limit: ${limit})`,
              platform: platform,
              llmInput: config.enableDebug ? cleanText : undefined // 只在调试模式下保存输入
          };
      }

      return {
        profile: llmResponse.content,
        items: items,
        userProfile: userProfile,
        debugInfo: debugInfo,
        fromCache: false
      }
  } catch (error: any) {
      let msg = error.message;
      if (msg.includes("402")) msg = I18nService.t('error_402');
      else if (msg.includes("401")) msg = I18nService.t('error_401');
      else if (msg.includes("429")) msg = I18nService.t('error_429');
      else if (msg.includes("404")) msg = I18nService.t('error_404');
      else if (msg.includes("500")) msg = I18nService.t('error_500');
      else if (msg.includes("Failed to fetch")) msg = I18nService.t('error_network');
      
      throw new Error(msg);
  }
}

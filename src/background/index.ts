import { LLMService } from "~services/LLMService"
import { ZhihuClient } from "~services/ZhihuClient"
import { ConfigService } from "~services/ConfigService"
import { ProfileService } from "~services/ProfileService"
import { HistoryService } from "~services/HistoryService"
import { TopicService } from "~services/TopicService"
import { CommentAnalysisService } from "~services/CommentAnalysisService"
import type { SupportedPlatform } from "~types"

export {}

console.log("DeepProfile Background Service Started")

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
          
          return CommentAnalysisService.analyzeComments(request.comments, contextTitle, contextContent);
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
            
            if (response.status === 401) friendlyMsg = "认证失败 (401) 🔑：请检查 API Key 是否正确哦。";
            else if (response.status === 402) friendlyMsg = "钱包空空如也 (402) 💸：请给 AI 服务商充点值吧～";
            else if (response.status === 404) friendlyMsg = "迷路了 (404) 🗺️：找不到这个模型，请检查模型名称。";
            else if (response.status === 429) friendlyMsg = "太热情啦 (429) 🔥：AI 有点忙不过来，请稍后再试。";
            
            throw new Error(`${friendlyMsg} \n详情: ${errText.slice(0, 100)}`);
        }

        return "连接成功！AI 随时待命 🚀";
    } catch (e) {
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
                throw new Error(`获取模型列表失败: ${response.status} ${errText}`);
            }
            
            const data = await response.json();
            return data.data.map((m: any) => m.id).sort();
        } 
        else if (provider === 'ollama') {
            const url = `${baseUrl || 'http://localhost:11434'}/api/tags`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`获取模型列表失败: ${response.status}`);
            const data = await response.json();
            return data.models.map((m: any) => m.name).sort();
        }
        else if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`获取模型列表失败: ${response.status}`);
            const data = await response.json();
            return (data.models || [])
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: any) => m.name.replace('models/', ''))
                .sort();
        }
        return [];
    } catch (e) {
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
  console.log(`Analyzing user: ${userId}, Platform: ${platform}, Context: ${context}, ForceRefresh: ${forceRefresh}`)
  const startTime = Date.now();
  
  // 1. Classify the context into a macro category
  let macroCategory = TopicService.classify(context || "");
  if (macroCategory === 'general') {
    console.log("Keyword classification failed, falling back to LLM classification...");
    await sendProgress(tabId, "关键词分类失败，尝试使用 AI 分类...");
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
      await sendProgress(tabId, `已加载该用户的【${categoryName}】画像 (秒开!)`);
      
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

  await sendProgress(tabId, `正在获取${platform === 'zhihu' ? '知乎' : platform === 'reddit' ? 'Reddit' : platform}用户信息...`)
  
  const userProfile = await ProfileService.fetchUserProfile(platform, userId)
  
  if (userProfile) {
      await sendProgress(tabId, `正在分析 ${userProfile.name} 的相关动态...`)
  } else {
      await sendProgress(tabId, `正在获取相关动态...`)
  }

  const fetchResult = await ProfileService.fetchUserContent(platform, userId, limit, context)
  const items = fetchResult.items;
  
  if (!items || items.length === 0) {
    if (!userProfile) {
        throw new Error("哎呀，找不到这个用户的数据 🕵️‍♂️，可能是账号被封禁或设置了隐私保护。")
    }
  }

  await sendProgress(tabId, "AI 正在生成画像 (这可能需要几秒钟)...")

  // --- Structured Context for LLM ---
  let contextForLLM = '';
  if (context) {
      const parts = context.split('|').map(s => s.trim());
      const title = parts[0];
      const tags = parts.slice(1);
      contextForLLM += `【当前问题】: ${title}\n`;
      if (tags.length > 0) {
          contextForLLM += `【核心话题】: ${tags.join(', ')}\n\n`;
      }
  }

  let cleanText = ProfileService.cleanContentData(platform, items, userProfile)
  
  if (contextForLLM) {
      cleanText = contextForLLM + cleanText;
  }
  
  try {
      // Pass macroCategory (ID) to generateProfile for optimized prompting
      const llmResponse = await LLMService.generateProfile(cleanText, macroCategory)
      
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
  } catch (error) {
      let msg = error.message;
      if (msg.includes("402")) msg = "钱包空空如也 (402) 💸，请给 AI 服务商充点值吧～";
      else if (msg.includes("401")) msg = "芝麻开门失败 (401) 🔑，请检查 API Key 是否正确哦。";
      else if (msg.includes("429")) msg = "太热情啦 (429) 🔥，AI 有点忙不过来，请稍后再试。";
      else if (msg.includes("404")) msg = "迷路了 (404) 🗺️，找不到这个模型，请检查配置。";
      else if (msg.includes("500")) msg = "AI 服务商罢工了 (500) 💥，请稍后再试。";
      else if (msg.includes("Failed to fetch")) msg = "网络开小差了 🌐，请检查网络连接或代理设置。";
      
      throw new Error(msg);
  }
}

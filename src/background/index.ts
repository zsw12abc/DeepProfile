import { LLMService } from "~services/LLMService"
import { ZhihuClient } from "~services/ZhihuClient"
import { ConfigService } from "~services/ConfigService"
import { ProfileService } from "~services/ProfileService"
import { HistoryService } from "~services/HistoryService"
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
            
            if (response.status === 401) friendlyMsg = "认证失败 (401): 请检查 API Key 是否正确。";
            else if (response.status === 402) friendlyMsg = "余额不足 (402): 您的账户余额已耗尽，请充值。";
            else if (response.status === 404) friendlyMsg = "模型未找到 (404): 请检查模型名称是否正确。";
            else if (response.status === 429) friendlyMsg = "请求过多 (429): 触发了频率限制，请稍后再试。";
            
            throw new Error(`${friendlyMsg} \nDetails: ${errText.slice(0, 100)}`);
        }

        return "Connection successful! API is working.";
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
  
  // 1. Check cache first (if not forced)
  if (!forceRefresh) {
    // Pass context to getRecord to ensure we only get cache that matches the current context
    const cachedRecord = await HistoryService.getRecord(userId, platform, context);
    if (cachedRecord) {
      console.log(`Cache hit for user ${userId} with context ${context}`);
      await sendProgress(tabId, "已从本地缓存加载结果 (秒开!)");
      
      return {
        profile: cachedRecord.profileData,
        items: [], // We don't store raw items in cache to save space
        userProfile: null, // We'll need to fetch this if we want to show it, but for cache speed we skip
        fromCache: true,
        cachedAt: cachedRecord.timestamp,
        cachedContext: cachedRecord.context
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
        throw new Error("No user data found.")
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
      const llmResponse = await LLMService.generateProfile(cleanText)
      
      const totalDuration = Date.now() - startTime;

      // 2. Save to History
      await HistoryService.saveRecord({
        userId,
        platform,
        profileData: llmResponse.content,
        context: context,
        timestamp: Date.now(),
        model: llmResponse.model,
        version: "1.0"
      });

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
      if (msg.includes("402")) msg = "API 余额不足 (402)，请检查您的 AI 服务商账户。";
      else if (msg.includes("401")) msg = "API Key 无效 (401)，请检查设置。";
      else if (msg.includes("429")) msg = "API 请求过于频繁 (429)，请稍后再试。";
      
      throw new Error(msg);
  }
}
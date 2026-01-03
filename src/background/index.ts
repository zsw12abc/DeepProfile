import { LLMService } from "~services/LLMService"
import { ZhihuClient } from "~services/ZhihuClient"
import { ConfigService } from "~services/ConfigService"

export {}

console.log("DeepProfile Background Service Started")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_PROFILE") {
    const tabId = sender.tab?.id
    
    handleAnalysis(request.userId, tabId)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep the message channel open for async response
  }
})

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

async function handleAnalysis(userId: string, tabId?: number) {
  console.log(`Analyzing user: ${userId}`)
  const startTime = Date.now();
  
  // Get Config
  const config = await ConfigService.getConfig()
  const limit = config.analyzeLimit || 15

  await sendProgress(tabId, "正在获取用户信息...")
  
  // 1. Fetch User Profile (Nickname, Headline)
  const userProfile = await ZhihuClient.fetchUserProfile(userId)
  
  if (userProfile) {
      await sendProgress(tabId, `正在分析 ${userProfile.name} 的最近 ${limit} 条动态...`)
  } else {
      await sendProgress(tabId, `正在获取最近 ${limit} 条动态...`)
  }

  // 2. Fetch Content (Answers & Articles)
  const items = await ZhihuClient.fetchUserContent(userId, limit)
  
  if (!items || items.length === 0) {
    if (!userProfile) {
        throw new Error("No user data found.")
    }
  }

  await sendProgress(tabId, "AI 正在生成画像 (这可能需要几秒钟)...")

  // 3. Clean Data (Include Profile Info)
  const cleanText = ZhihuClient.cleanContentData(items, userProfile)
  
  // 4. Generate Profile
  const llmResponse = await LLMService.generateProfile(cleanText)
  
  const totalDuration = Date.now() - startTime;

  // Construct debug info if enabled
  let debugInfo = undefined;
  if (config.enableDebug) {
      debugInfo = {
          totalDurationMs: totalDuration,
          llmDurationMs: llmResponse.durationMs,
          itemsCount: items.length,
          model: llmResponse.model,
          tokens: llmResponse.usage
      };
  }

  return {
    profile: llmResponse.content,
    items: items, // Return raw items to frontend for linking
    userProfile: userProfile,
    debugInfo: debugInfo
  }
}

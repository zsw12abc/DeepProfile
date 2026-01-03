import { LLMService } from "~services/LLMService"
import { ZhihuClient } from "~services/ZhihuClient"

export {}

console.log("DeepProfile Background Service Started")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_PROFILE") {
    handleAnalysis(request.userId)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep the message channel open for async response
  }
})

async function handleAnalysis(userId: string) {
  console.log(`Analyzing user: ${userId}`)
  
  // 1. Fetch User Profile (Nickname, Headline)
  const userProfile = await ZhihuClient.fetchUserProfile(userId)

  // 2. Fetch Content (Answers & Articles)
  const items = await ZhihuClient.fetchUserContent(userId)
  
  // 3. Clean Data (Include Profile Info)
  const cleanText = ZhihuClient.cleanContentData(items, userProfile)
  
  if (!items || items.length === 0) {
    if (!userProfile) {
        throw new Error("No user data found.")
    }
  }

  // 4. Generate Profile
  const profileJson = await LLMService.generateProfile(cleanText)
  
  // 5. Return structured data
  return {
    profile: profileJson,
    items: items, // Return raw items to frontend for linking
    userProfile: userProfile
  }
}

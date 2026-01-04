import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { ProfileCard } from "~components/ProfileCard"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"]
}

const ZhihuOverlay = () => {
  const [targetUser, setTargetUser] = useState<string | null>(null)
  const [initialNickname, setInitialNickname] = useState<string | undefined>()
  const [profileData, setProfileData] = useState<{
    profile: string
    items: ZhihuContent[]
    userProfile: UserProfile | null
    debugInfo?: any
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("正在初始化...")
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    // Listen for progress messages from background
    const messageListener = (request: any) => {
      if (request.type === "ANALYSIS_PROGRESS") {
        setStatusMessage(request.message)
      }
    }
    chrome.runtime.onMessage.addListener(messageListener)
    
    // 安全地清理事件监听器
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener)
      } catch (e) {
        // 忽略上下文失效错误
        console.debug("Extension context may have been invalidated, ignoring error:", e)
      }
    }
  }, [])

  useEffect(() => {
    // Function to inject analyze buttons
    const injectButtons = () => {
      const links = document.querySelectorAll('.UserLink-link[href*="/people/"]')
      
      links.forEach((link) => {
        if (link.getAttribute("data-deep-profile-injected")) return
        
        const href = link.getAttribute("href") || ""
        const match = href.match(/\/people\/([^/?]+)/)
        if (!match) return
        const userId = match[1]

        if (link.querySelector('img')) return
        if (!link.textContent?.trim()) return
        if (link.closest('.Popover-content')) return

        const btn = document.createElement("span")
        btn.innerText = " 🔍"
        btn.style.cursor = "pointer"
        btn.style.fontSize = "14px"
        btn.style.marginLeft = "4px"
        btn.style.color = "#8590a6"
        btn.style.verticalAlign = "middle"
        btn.style.display = "inline-block"
        btn.title = "DeepProfile 分析"
        btn.className = "deep-profile-btn"
        
        btn.onmouseover = () => { btn.style.color = "#0084ff" }
        btn.onmouseout = () => { btn.style.color = "#8590a6" }

        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          const nickname = link.textContent?.trim()
          
          // --- Enhanced Context Extraction ---
          let contextParts: string[] = [];
          
          // 1. Get Question Title
          const questionHeader = document.querySelector('.QuestionHeader-title');
          if (questionHeader) {
              contextParts.push(questionHeader.textContent?.trim() || "");
          }

          // 2. Get all Topic Tags
          const topicTags = document.querySelectorAll('.QuestionTopic .Tag-content');
          topicTags.forEach(tag => {
              contextParts.push(tag.textContent?.trim() || "");
          });

          // 3. Fallback to closest ContentItem title
          if (contextParts.length === 0) {
              const contentItem = link.closest('.ContentItem');
              if (contentItem) {
                  const title = contentItem.querySelector('.ContentItem-title');
                  if (title) contextParts.push(title.textContent?.trim() || "");
              }
          }

          const richContext = contextParts.filter(Boolean).join(' | '); // Use a separator

          handleAnalyze(userId, nickname, richContext)
        }

        link.setAttribute("data-deep-profile-injected", "true")
        
        if (link.parentNode) {
            link.parentNode.insertBefore(btn, link.nextSibling)
        }
      })
    }

    injectButtons()

    const observer = new MutationObserver(() => {
      injectButtons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 安全地清理DOM观察器
    return () => {
      try {
        observer.disconnect()
      } catch (e) {
        // 忽略上下文失效错误
        console.debug("Extension context may have been invalidated, ignoring error:", e)
      }
    }
  }, [])

  const handleAnalyze = async (userId: string, nickname?: string, context?: string) => {
    setTargetUser(userId)
    setInitialNickname(nickname)
    setLoading(true)
    setStatusMessage("正在连接后台服务...")
    setError(undefined)
    setProfileData(null)

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_PROFILE",
        userId,
        context, // Send rich context to background
        platform: 'zhihu' // Specify platform
      })

      if (response.success) {
        setProfileData(response.data)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to communicate with background service.")
    } finally {
      setLoading(false)
    }
  }

  if (!targetUser) return null

  return (
    <ProfileCard
      userId={targetUser}
      initialNickname={initialNickname}
      profileData={profileData}
      loading={loading}
      statusMessage={statusMessage}
      error={error}
      onClose={() => setTargetUser(null)}
    />
  )
}

export default ZhihuOverlay
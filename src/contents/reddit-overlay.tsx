import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { ProfileCard } from "~components/ProfileCard"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

export const config: PlasmoCSConfig = {
  matches: ["https://www.reddit.com/*", "https://old.reddit.com/*"]
}

const RedditOverlay = () => {
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
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  useEffect(() => {
    // Function to inject analyze buttons
    const injectButtons = () => {
      // Find user profile links in Reddit
      const userLinks = document.querySelectorAll('a[href*="/user/"], .author, .user')
      
      userLinks.forEach((link) => {
        if (link.getAttribute("data-deep-profile-injected")) return
        
        // Extract username from href or text content
        let userId = null
        const href = link.getAttribute("href") || ""
        const match = href.match(/\/user\/([^\/\?#]+)/)
        if (match) {
          userId = match[1]
        } else if (link.textContent && link.textContent.trim().startsWith('u/')) {
          userId = link.textContent.trim().substring(2) // Remove 'u/' prefix
        } else {
          userId = link.textContent?.trim() || null
        }
        
        if (!userId || userId === '[deleted]' || userId === 'AutoModerator') return

        // Skip if it's already an image or button
        if (link.querySelector('img')) return
        if (!link.textContent?.trim()) return

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
          
          const nickname = link.textContent?.trim() || userId
          
          // Extract context from the current post/thread
          let contextParts: string[] = [];
          
          // Get post title if available
          const postTitle = document.querySelector('h1[data-test-id="post-title"]') || 
                           document.querySelector('div[data-adclicklocation="title"] h3')
          if (postTitle) {
              contextParts.push(postTitle.textContent?.trim() || "")
          }

          // Get subreddit name
          const subredditElement = document.querySelector('span[class*="subreddit"]') ||
                                  document.querySelector('a[data-click-id="subreddit"]')
          if (subredditElement) {
              const subreddit = subredditElement.textContent?.trim()
              if (subreddit && !subreddit.startsWith('/r/')) {
                  contextParts.push(`r/${subreddit}`)
              } else if (subreddit) {
                  contextParts.push(subreddit)
              }
          }

          const richContext = contextParts.filter(Boolean).join(' | ')

          handleAnalyze(userId, nickname, richContext)
        }

        link.setAttribute("data-deep-profile-injected", "true")
        
        if (link.parentNode) {
            // Try to insert after the link
            if (link.nextSibling) {
                link.parentNode.insertBefore(btn, link.nextSibling)
            } else {
                link.parentNode.appendChild(btn)
            }
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

    return () => observer.disconnect()
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
        platform: 'reddit' // Specify platform
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

export default RedditOverlay
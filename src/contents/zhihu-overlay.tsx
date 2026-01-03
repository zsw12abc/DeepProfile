import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { ProfileCard } from "~components/ProfileCard"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"]
}

const ZhihuOverlay = () => {
  const [targetUser, setTargetUser] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<{
    profile: string
    items: ZhihuContent[]
    userProfile: UserProfile | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    // Function to inject analyze buttons
    const injectButtons = () => {
      // Target user links specifically. 
      // We select .UserLink-link but we need to filter out avatars.
      // Usually avatars are inside a link but contain an <img> tag, or have specific classes.
      // Text links usually contain text directly.
      const links = document.querySelectorAll('a[href*="/people/"]')
      
      links.forEach((link) => {
        if (link.getAttribute("data-deep-profile-injected")) return
        
        // 1. Check if it's a valid user link
        const href = link.getAttribute("href") || ""
        const match = href.match(/\/people\/([^/?]+)/)
        if (!match) return
        const userId = match[1]

        // 2. Filter out avatars or non-text links
        // If the link contains an image, it's likely an avatar -> skip
        if (link.querySelector('img')) return
        
        // If the link has no text content, skip
        if (!link.textContent?.trim()) return

        // 3. Avoid duplicate buttons in the same container (e.g. if name appears twice)
        // This is tricky, but usually checking if it's an image is enough.
        
        // 4. Specific Zhihu classes check
        // .UserLink-link is the most common class for user names.
        // Sometimes it's just <a> inside .AuthorInfo
        // We want to be broad but exclude avatars.

        // Create button
        const btn = document.createElement("span")
        btn.innerText = " 🔍"
        btn.style.cursor = "pointer"
        btn.style.fontSize = "14px"
        btn.style.marginLeft = "4px"
        btn.style.color = "#8590a6"
        btn.title = "DeepProfile 分析"
        btn.className = "deep-profile-btn" // Add class for potential styling
        
        btn.onmouseover = () => { btn.style.color = "#0084ff" }
        btn.onmouseout = () => { btn.style.color = "#8590a6" }

        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          handleAnalyze(userId)
        }

        link.setAttribute("data-deep-profile-injected", "true")
        
        // Insert after the link
        if (link.parentNode) {
            link.parentNode.insertBefore(btn, link.nextSibling)
        }
      })
    }

    // Initial injection
    injectButtons()

    // Observer for dynamic content
    const observer = new MutationObserver(() => {
      injectButtons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [])

  const handleAnalyze = async (userId: string) => {
    setTargetUser(userId)
    setLoading(true)
    setError(undefined)
    setProfileData(null)

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_PROFILE",
        userId
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
      profileData={profileData}
      loading={loading}
      error={error}
      onClose={() => setTargetUser(null)}
    />
  )
}

export default ZhihuOverlay

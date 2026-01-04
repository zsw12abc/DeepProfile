import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState, useRef } from "react"
import { ProfileCard } from "~components/ProfileCard"
import { ConfigService } from "~services/ConfigService"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"]
}

const ZhihuOverlay = () => {
  const [targetUser, setTargetUser] = useState<string | null>(null)
  const [initialNickname, setInitialNickname] = useState<string | undefined>()
  const [currentContext, setCurrentContext] = useState<string | undefined>()
  const [profileData, setProfileData] = useState<{
    profile: any // Changed to any to match ProfileCard props
    items: ZhihuContent[]
    userProfile: UserProfile | null
    debugInfo?: any
    fromCache?: boolean
    cachedAt?: number
    cachedContext?: string
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
    let observer: MutationObserver | null = null;
    let isEnabled = false;

    // 清理函数：停止观察并移除所有已注入的元素
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      document.querySelectorAll('.deep-profile-btn').forEach(el => el.remove());
      document.querySelectorAll('[data-deep-profile-injected]').forEach(el => el.removeAttribute('data-deep-profile-injected'));
    };

    // 注入逻辑
    const injectButtons = () => {
      if (!isEnabled) return;

      // 1. 清理孤儿按钮
      document.querySelectorAll('.deep-profile-btn').forEach(btn => {
          const prev = btn.previousElementSibling as HTMLAnchorElement | null;
          if (!prev || prev.tagName !== 'A' || !prev.href.includes('www.zhihu.com/people/')) {
              btn.remove();
          }
      });

      // 2. 检查并重置状态
      const injectedLinks = document.querySelectorAll('a[data-deep-profile-injected="true"]');
      injectedLinks.forEach(link => {
          const next = link.nextElementSibling;
          if (!next || !next.classList.contains('deep-profile-btn')) {
              link.removeAttribute('data-deep-profile-injected');
          }
      });

      // 3. 注入新按钮
      const links = document.querySelectorAll('a[href*="www.zhihu.com/people/"]')
      
      links.forEach((element) => {
        const link = element as HTMLAnchorElement
        if (link.getAttribute("data-deep-profile-injected")) return
        
        const match = link.href.match(/www\.zhihu\.com\/people\/([^/?#]+)\/?(\?|$|#)/)
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
          
          let contextParts: string[] = [];
          const questionHeader = document.querySelector('.QuestionHeader-title');
          if (questionHeader) contextParts.push(questionHeader.textContent?.trim() || "");

          const topicTags = document.querySelectorAll('.QuestionTopic .Tag-content');
          topicTags.forEach(tag => contextParts.push(tag.textContent?.trim() || ""));

          if (contextParts.length === 0) {
              const contentItem = link.closest('.ContentItem');
              if (contentItem) {
                  const title = contentItem.querySelector('.ContentItem-title');
                  if (title) contextParts.push(title.textContent?.trim() || "");
              }
          }

          const richContext = contextParts.filter(Boolean).join(' | ');
          handleAnalyze(userId, nickname, richContext)
        }

        link.setAttribute("data-deep-profile-injected", "true")
        
        if (link.parentNode) {
            link.parentNode.insertBefore(btn, link.nextSibling)
        }
      })
    }

    const startInjection = () => {
      if (observer) return; // Already running
      
      injectButtons();
      
      observer = new MutationObserver(() => {
        if (isEnabled) injectButtons();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    };

    const checkConfig = async () => {
      const config = await ConfigService.getConfig();
      const newEnabled = config.globalEnabled;
      
      // console.log("Checking config. Enabled:", newEnabled);

      if (newEnabled !== isEnabled) {
        isEnabled = newEnabled;
        if (isEnabled) {
          startInjection();
        } else {
          cleanup();
        }
      } else if (isEnabled && !observer) {
          // If enabled but observer died for some reason
          startInjection();
      }
    };

    // Initial check
    checkConfig();

    // Listen for storage changes to react immediately to options changes
    const storageListener = (changes: any, area: string) => {
      if (area === 'local' && changes['deep_profile_config']) {
        checkConfig();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      cleanup();
    };
  }, [])

  const handleAnalyze = async (userId: string, nickname?: string, context?: string, forceRefresh: boolean = false) => {
    setTargetUser(userId)
    setInitialNickname(nickname)
    setCurrentContext(context)
    setLoading(true)
    setStatusMessage(forceRefresh ? "正在强制刷新..." : "正在连接后台服务...")
    setError(undefined)
    if (forceRefresh) {
        setProfileData(null)
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_PROFILE",
        userId,
        context, // Send rich context to background
        platform: 'zhihu', // Specify platform
        forceRefresh
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

  const handleRefresh = () => {
      if (targetUser) {
          handleAnalyze(targetUser, initialNickname, currentContext, true);
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
      onRefresh={handleRefresh}
    />
  )
}

export default ZhihuOverlay
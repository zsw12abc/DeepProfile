import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import { ProfileCard } from "~components/ProfileCard"
import { ConfigService } from "~services/ConfigService"
import { I18nService } from "~services/I18nService"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

export const config: PlasmoCSConfig = {
  matches: ["https://www.reddit.com/*", "https://old.reddit.com/*", "https://reddit.com/*"]
}

const RedditOverlay = () => {
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
  const [statusMessage, setStatusMessage] = useState(I18nService.t('loading'))
  const [error, setError] = useState<string | undefined>()
  const overlayContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Initialize I18n
    I18nService.init();

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

  // 创建独立的overlay容器
  const createOverlayContainer = useCallback(() => {
    let container = document.getElementById('deep-profile-overlay-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'deep-profile-overlay-container';
      // 定位在右下角，与zhihu overlay类似，但使用Reddit风格的样式
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000000;
        width: 380px;
        max-height: 80vh;
        overflow-y: auto;
        background-color: #f0f2f5; /* Reddit的主要背景色 */
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        border-radius: 8px; /* 更符合Reddit的圆角 */
        padding: 0; /* 移除容器的padding，让ProfileCard组件自己处理 */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: #1c1c1c; /* Reddit的深灰色文本 */
        border: 1px solid #ccc; /* 轻微边框以匹配Reddit风格 */
      `;
      document.body.appendChild(container);
    }
    
    return container;
  }, []);

  // 移除overlay容器
  const removeOverlayContainer = useCallback(() => {
    const container = document.getElementById('deep-profile-overlay-container');
    if (container) {
      container.remove();
    }
  }, []);

  // 渲染overlay到独立容器
  useEffect(() => {
    if (targetUser) {
      const container = createOverlayContainer();
      const root = createRoot(container);
      
      // 由于ProfileCard组件本身是固定定位的，我们不需要再创建额外的包装
      // 直接渲染ProfileCard，但通过props来控制关闭行为
      root.render(
        <ProfileCard
          userId={targetUser}
          initialNickname={initialNickname}
          profileData={profileData}
          loading={loading}
          statusMessage={statusMessage}
          error={error}
          onClose={() => {
            setTargetUser(null);
            removeOverlayContainer();
          }}
          onRefresh={() => {
            if (targetUser) {
              handleAnalyze(targetUser, initialNickname, currentContext, true);
            }
          }}
        />
      );
      
      // 添加点击外部区域关闭overlay的功能
      const handleClickOutside = (event: MouseEvent) => {
        if (container && !container.contains(event.target as Node)) {
          setTargetUser(null);
          removeOverlayContainer();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        root.unmount();
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      // 当没有目标用户时，移除容器
      removeOverlayContainer();
    }
  }, [targetUser, profileData, loading, statusMessage, error, initialNickname, currentContext]);

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
          if (!prev || prev.tagName !== 'A' || !prev.href.includes('/user/')) {
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
      const links = document.querySelectorAll('a[href*="/user/"]')
      
      links.forEach((element) => {
        const link = element as HTMLAnchorElement
        if (link.getAttribute("data-deep-profile-injected")) return
        
        const href = link.href
        const match = href.match(/\/user\/([^\/\?#]+)/i)
        if (!match) return
        
        const userId = match[1]

        if (!userId || userId === '[deleted]' || userId === 'AutoModerator' || userId === 'reddit' || userId === '') return
        if (link.querySelector('img')) return
        if (!link.textContent?.trim()) return
        if (link.closest('.avatar') || link.closest('[aria-label*="avatar"]')) return

        const btn = document.createElement("span")
        btn.innerHTML = " 🔍"  // Using innerHTML to properly render emoji
        btn.style.cursor = "pointer"
        btn.style.fontSize = "14px"
        btn.style.marginLeft = "4px"
        btn.style.color = "#8590a6"
        btn.style.verticalAlign = "middle"
        btn.style.display = "inline-block"
        btn.title = I18nService.t('deep_profile_analysis')
        btn.className = "deep-profile-btn"
        
        btn.onmouseover = () => { btn.style.color = "#0084ff" }
        btn.onmouseout = () => { btn.style.color = "#8590a6" }

        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          // 阻止链接的默认行为，防止Reddit悬停卡片显示
          e.stopImmediatePropagation()
          
          const nickname = link.textContent?.trim()
          
          // Extract context from the current post/thread
          let contextParts: string[] = [];
          
          // Get post title if available - try multiple selectors
          const postTitleSelectors = [
            'h1[data-test-id="post-title"]',
            'div[data-adclicklocation="title"] h3',
            'shreddit-title',
            'h1._eYtD2DCq_3tMHxLg12j', // New Reddit design
            'h1#post-title',
            '.post-title',
            '.PostTitle',
            '[data-testid="post-title"]',
            'h2[data-testid="post-title-text"]'
          ];
          
          let postTitle = null;
          for (const selector of postTitleSelectors) {
            postTitle = document.querySelector(selector);
            if (postTitle) break;
          }
          
          if (postTitle) {
              contextParts.push(postTitle.textContent?.trim() || "")
          }

          // Get subreddit name - try multiple selectors
          const subredditSelectors = [
            'span[class*="subreddit"]',
            'a[data-click-id="subreddit"]',
            'a[href^="/r/"]',
            '.subreddit',
            '.SubredditIcon',
            'a[href^="/r/"]',
            '[data-testid="subreddit"]',
            '[data-testid="community-name"]'
          ];
          
          let subredditElement = null;
          for (const selector of subredditSelectors) {
            subredditElement = document.querySelector(selector);
            if (subredditElement) break;
          }
          
          if (subredditElement) {
              const subreddit = subredditElement.textContent?.trim()
              if (subreddit && !subreddit.startsWith('/r/')) {
                  contextParts.push(`r/${subreddit}`)
              } else if (subreddit) {
                  contextParts.push(subreddit)
              }
          }
          
          // Get post tags/categories if available
          const tagElements = document.querySelectorAll('.icon-tag, .tag, [class*="tag"], [data-testid*="tag"]');
          tagElements.forEach(tag => {
            const tagText = tag.textContent?.trim();
            if (tagText && !contextParts.includes(tagText)) {
              contextParts.push(tagText);
            }
          });

          const richContext = contextParts.filter(Boolean).join(' | ')

          // Set the target user to show the overlay
          setTargetUser(userId)
          setInitialNickname(nickname)
          setCurrentContext(richContext)
          
          // Also trigger the analysis
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
    // Don't reset the UI state here since we want to keep the overlay visible
    setLoading(true)
    setStatusMessage(forceRefresh ? I18nService.t('reanalyze') + "..." : I18nService.t('analyzing') + "...")
    setError(undefined)
    if (forceRefresh) {
        setProfileData(null)
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_PROFILE",
        userId,
        context, // Send rich context to background
        platform: 'reddit', // Specify platform
        forceRefresh
      })

      if (response.success) {
        setProfileData(response.data)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError(I18nService.t('error_network'))
    } finally {
      setLoading(false)
    }
  }

  // 不渲染任何内容，因为overlay是通过DOM操作渲染的
  return null;
}

export default RedditOverlay
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import { ProfileCard } from "~components/ProfileCard"
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
  const [statusMessage, setStatusMessage] = useState("正在初始化...")
  const [error, setError] = useState<string | undefined>()
  const overlayContainerRef = useRef<HTMLDivElement | null>(null)

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
        padding: 16px; /* 减少内边距以匹配Reddit风格 */
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
      
      // 使用Reddit风格的样式包装ProfileCard
      root.render(
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            backgroundColor: '#ffffff', /* 内容区域使用白色 */
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            minHeight: 0, // 使内部内容可以滚动
            maxHeight: 'calc(80vh - 40px)' // 考虑外部容器的padding
          }}>
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
          </div>
        </div>
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

  // Function to inject analyze buttons
  useEffect(() => {
    const injectButtons = () => {
      console.log("Attempting to inject buttons on Reddit page..."); // Debug log
      
      // Ensure we're on a Reddit page
      if (!window.location.hostname.includes('reddit.com')) {
        console.log('Not on a Reddit page, skipping injection');
        return;
      }
      
      // Find only the actual用户 profile links (href="/user/...") that are not on avatars
      // We specifically look for <a> tags with href containing "/user/" but exclude those that are likely avatars
      const userLinks = Array.from(document.querySelectorAll(
        `a[href*="/user/"]:not([data-deep-profile-injected])`
      )).filter((el: Element) => {
        // Ensure it's an anchor element and has the correct href pattern
        const href = el.getAttribute('href');
        
        // Skip if it's likely an avatar (has aria-label containing 'avatar')
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.toLowerCase().includes('avatar')) {
          return false;
        }
        
        // Skip if it has classes indicating it's an avatar/image
        const classes = el.className.toLowerCase();
        if (classes.includes('avatar') || classes.includes('snoo') || classes.includes('img')) {
          return false;
        }
        
        // Skip if it contains an img element (likely an avatar)
        if (el.querySelector('img')) {
          return false;
        }
        
        return href && href.includes('/user/');
      }) as HTMLAnchorElement[];
      
      console.log(`Found ${userLinks.length} user profile links`); // Debug log
      
      userLinks.forEach((link) => {
        // Extract username from href
        const href = link.getAttribute("href") || ""
        const match = href.match(/\/user\/([^\/\?#]+)/i)
        if (!match) return;
        
        const userId = match[1]
        
        console.log(`Processing user link with href: ${href}, extracted userId: ${userId}`); // Debug log
        
        if (!userId || userId === '[deleted]' || userId === 'AutoModerator' || userId === 'reddit' || userId === '') return

        // Skip if the link is a subreddit link instead of user link (though with our selector this shouldn't happen)
        if (href.includes('/r/') && !href.includes('/user/')) {
          console.log("Skipping subreddit link"); // Debug log
          return
        }

        const btn = document.createElement("span")
        btn.innerHTML = "🔍"  // Using innerHTML to properly render emoji
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
          
          // 阻止链接的默认行为，防止Reddit悬停卡片显示
          e.stopImmediatePropagation()
          
          const nickname = link.textContent?.trim() || userId
          
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

          console.log(`Triggering analysis for user: ${userId}, nickname: ${nickname}, context: ${richContext}`); // Debug log
          
          // Set the target user to show the overlay
          setTargetUser(userId)
          setInitialNickname(nickname)
          setCurrentContext(richContext)
          
          // Also trigger the analysis
          handleAnalyze(userId, nickname, richContext)
        }

        // Prevent the original link from triggering hover cards
        link.addEventListener('click', (e) => {
          if (document.getElementById('deep-profile-overlay-container')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        }, true); // 使用捕获阶段

        // Properly insert the button next to the link
        link.setAttribute("data-deep-profile-injected", "true");
        
        // Insert the button directly after the link
        if (link.parentNode) {
          link.parentNode.insertBefore(btn, link.nextSibling);
        } else {
          // Fallback: append to the link itself if it's allowed
          link.appendChild(btn);
        }
        
        console.log("Successfully injected button for user:", userId); // Debug log
      })
    }

    // Run immediately
    injectButtons()

    // Set up observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      // Check if new content has been added
      let shouldInject = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldInject = true;
          break;
        }
      }
      
      if (shouldInject) {
        // Add a small delay to ensure content is fully loaded
        setTimeout(() => {
          injectButtons();
        }, 500);
      }
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

  const handleAnalyze = async (userId: string, nickname?: string, context?: string, forceRefresh: boolean = false) => {
    // Don't reset the UI state here since we want to keep the overlay visible
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
        platform: 'reddit', // Specify platform
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

  // 不渲染任何内容，因为overlay是通过DOM操作渲染的
  return null;
}

export default RedditOverlay
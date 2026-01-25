import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ProfileCard } from "../components/ProfileCard"
import { ConfigService } from "../services/ConfigService"
import { I18nService } from "../services/I18nService"
import type { ZhihuContent, UserProfile, UserHistoryRecord, SupportedPlatform } from "../services/ZhihuClient"
import type { ProfileData } from "../types"
import { DEFAULT_CONFIG } from "../types"

export const config: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://*.twitter.com/*", "https://x.com/*", "https://*.x.com/*"]
}

const TwitterOverlay = () => {
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
  const [statusMessage, setStatusMessage] = useState(() => {
    try {
      return I18nService.t('loading');
    } catch (e) {
      console.warn("Failed to get translation, extension context may be invalidated:", e);
      return 'Loading...';
    }
  })
  const [progressPercentage, setProgressPercentage] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | undefined>()
  const rootRef = useRef<Root | null>(null)

  useEffect(() => {
    // Initialize I18n
    try {
      I18nService.init();
    } catch (e) {
      console.warn("Failed to initialize I18n, extension context may be invalidated:", e);
    }

    // Listen for progress messages from background
    const messageListener = (request: any) => {
      if (request.type === "ANALYSIS_PROGRESS") {
        setStatusMessage(request.message)
        // Do not reset progress percentage to avoid flickering
        // setProgressPercentage(undefined) 
      } else if (request.type === "ANALYSIS_PROGRESS_ESTIMATE") {
        setStatusMessage(request.message)
        if (request.percentage !== undefined) {
          setProgressPercentage(request.percentage)
        }
      }
    }
    
    // 安全地添加消息监听器
    try {
      chrome.runtime.onMessage.addListener(messageListener)
    } catch (e) {
      console.warn("Failed to add message listener, extension context may be invalidated:", e)
    }
    
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
    // Check if document is available
    if (typeof document === 'undefined' || !document.body) {
      console.warn('Document not available for overlay container creation');
      return null;
    }
    
    let container = document.getElementById('deep-profile-overlay-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'deep-profile-overlay-container';
      // 容器本身不设置样式，由ProfileCard组件控制
      document.body.appendChild(container);
    }
    
    return container;
  }, []);

  // 移除overlay容器
  const removeOverlayContainer = useCallback(() => {
    // Check if document is available
    if (typeof document === 'undefined') {
      console.warn('Document not available for overlay container removal');
      return;
    }
    
    const container = document.getElementById('deep-profile-overlay-container');
    if (container) {
      // 如果存在React root，先卸载它
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      container.remove();
    }
  }, []);

  // 渲染overlay到独立容器
  useEffect(() => {
    if (targetUser) {
      const container = createOverlayContainer();
      
      // 检查容器是否存在
      if (!container) {
        console.warn('Failed to create overlay container');
        return;
      }
      
      // 如果还没有创建root，就创建一个新的
      if (!rootRef.current) {
        rootRef.current = createRoot(container);
      }
      
      // 准备ProfileCard所需的数据结构
      const recordData = {
        userId: targetUser,
        platform: 'twitter' as SupportedPlatform,
        nickname: initialNickname || targetUser,
        profileData: profileData?.profile || null,
        items: profileData?.items || [],
        userProfile: profileData?.userProfile || null,
        debugInfo: profileData?.debugInfo,
        fromCache: profileData?.fromCache || false,
        cachedAt: profileData?.cachedAt || 0,
        cachedContext: profileData?.cachedContext || ""
      };
      
      // 无论何时，只要状态改变就重新渲染
      try {
        rootRef.current.render(
          <ProfileCard
            record={recordData}
            platform={'twitter'}
            isLoading={loading}
            statusMessage={statusMessage}
            progressPercentage={progressPercentage}
            error={error}
            onRefresh={() => {
              if (targetUser) {
                handleAnalyze(targetUser, initialNickname, currentContext, true);
              }
            }}
            onClose={() => setTargetUser(null)}
            onExport={undefined}
          />
        );
      } catch (e) {
        console.error('Failed to render ProfileCard:', e);
      }
      
      // 添加点击外部区域关闭overlay的功能
      const handleClickOutside = (event: MouseEvent) => {
        // 检查点击是否在ProfileCard内部
        // 由于ProfileCard渲染在container内部，我们只需要检查container是否包含target
        // 但是ProfileCard组件本身有样式，container只是一个包装器
        // 实际上ProfileCard组件渲染了一个fixed定位的div，我们需要确保点击不在那个div上
        // 这里简化处理：如果点击的是container本身（如果它覆盖全屏）或者body，则关闭
        // 但目前的实现container只是一个挂载点，ProfileCard是fixed定位
        // 最好的方式是在ProfileCard内部处理点击外部，或者在这里通过类名判断
        
        // 简单实现：如果点击的目标不在ProfileCard的DOM树中，则关闭
        // 注意：这需要ProfileCard组件有一个明确的根元素引用，或者我们可以假设container的第一个子元素是ProfileCard
        // 由于React Portal或直接render，container内部就是ProfileCard的内容
        
        // 更好的方法：让ProfileCard组件处理点击外部，或者在这里不做处理，只依赖关闭按钮
        // 为了用户体验，我们暂时只依赖关闭按钮，避免误触关闭
      };
      
      // document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        // document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      // 当没有目标用户时，移除容器
      removeOverlayContainer();
    }
  }, [targetUser, profileData, loading, statusMessage, error, initialNickname, currentContext, progressPercentage]);

  // 监听来自后台脚本的消息
  useEffect(() => {
    const handleMessageFromBackground = async (request: any, sender: any, sendResponse: (response: any) => void) => {
      if (request && request.type === 'TWITTER_CONTENT_REQUEST') {
        const { requestId, username, limit, url } = request;
        
        // 从页面中抓取Twitter内容
        const scrapedContent = await scrapeTwitterContent(username, limit);
        
        // 发送响应回后台脚本
        chrome.runtime.sendMessage({
          type: 'TWITTER_CONTENT_RESPONSE',
          requestId,
          content: scrapedContent
        }).catch(error => {
          console.warn('Failed to send response to background script:', error);
        });
      }
    };

    // 安全地添加消息监听器
    try {
      chrome.runtime.onMessage.addListener(handleMessageFromBackground);
    } catch (e) {
      console.warn("Failed to add message listener, extension context may be invalidated:", e);
    }

    return () => {
      // 安全地清理事件监听器
      try {
        chrome.runtime.onMessage.removeListener(handleMessageFromBackground);
      } catch (e) {
        console.warn("Failed to remove message listener, extension context may be invalidated:", e);
      }
    };
  }, []);

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
      if (!isEnabled || typeof document === 'undefined') return;

      // 1. 清理孤儿按钮
      try {
        document.querySelectorAll('.deep-profile-btn').forEach(btn => {
            const prev = btn.previousElementSibling as HTMLAnchorElement | null;
            if (!prev || prev.tagName !== 'A') {
                btn.remove();
            }
        });
      } catch (e) {
        console.warn('Failed to clean orphaned buttons, document may not be available:', e);
        return; // Exit early if document operations fail
      }

      // 2. 检查并重置状态
      try {
        const injectedLinks = document.querySelectorAll('a[data-deep-profile-injected="true"]');
        injectedLinks.forEach(link => {
            const next = link.nextElementSibling;
            if (!next || !next.classList.contains('deep-profile-btn')) {
                link.removeAttribute('data-deep-profile-injected');
            }
        });
      } catch (e) {
        console.warn('Failed to reset button states, document may not be available:', e);
        return; // Exit early if document operations fail
      }

      // 3. 注入新按钮
      let links: Element[] = [];
      try {
        // 使用更精确的选择器，只针对用户名显示
        // 1. [data-testid="User-Name"] a:not([tabindex="-1"]): 推文流中的用户名，排除handle链接
        // 2. [data-testid="UserCell"] a:not([tabindex="-1"]): 用户列表中的用户名，排除handle链接
        const candidates = document.querySelectorAll(
            '[data-testid="User-Name"] a:not([tabindex="-1"]), ' + 
            '[data-testid="UserCell"] a:not([tabindex="-1"])'
        );
        
        links = Array.from(candidates).filter(link => {
            const href = link.getAttribute('href') || '';
            // 再次确保不包含 status 或 photo 链接
            return !href.includes('/status/') && !href.includes('/photo/');
        });
      } catch (e) {
        console.warn('Failed to query user links, document may not be available:', e);
        return; // Exit early if document operations fail
      }
      
      links.forEach((element) => {
        const link = element as HTMLAnchorElement
        
        // 检查是否已经注入过按钮
        if (link.getAttribute("data-deep-profile-injected")) return
        
        // 提取用户名
        let userId = '';
        let href = link.href || '';
        
        // 尝试从href中提取用户名
        if (href) {
          const match = href.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\?#]+)/i);
          if (match && match[1] && !match[1].startsWith('intent')) {
            userId = match[1];
          }
        }
        
        // 如果链接来自data-testid="UserCell"，尝试从嵌套元素中获取用户名
        if (!userId && link.dataset.testid === 'UserCell') {
          const usernameElement = link.querySelector('span:first-child, div span');
          if (usernameElement) {
            // 通常Twitter用户名以@开头
            const text = usernameElement.textContent || '';
            const usernameMatch = text.match(/@?([A-Za-z0-9_]+)/);
            if (usernameMatch && usernameMatch[1]) {
              userId = usernameMatch[1];
            }
          }
        }
        
        if (!userId || userId === 'home' || userId === 'explore' || userId === 'notifications' || 
            userId === 'messages' || userId === 'verified' || userId === 'settings' || 
            userId === 'tos' || userId === 'privacy' || userId === 'login' || 
            userId === 'register' || userId === 'search' || userId === 'i' || 
            userId === 'compose' || userId === 'account' || userId === 'lists' || 
            userId === 'topics' || userId === 'communities' || userId === 'bookmarks') return
            
        if (link.querySelector('img') && link.querySelector('img').closest('img[alt*="avatar"], img[alt*="photo"]')) return
        if (!link.textContent?.trim()) return
        if (link.closest('.avatar') || link.closest('[aria-label*="avatar"]')) return

        // 在注入新按钮之前，先检查该链接是否已经有按钮但未标记为已注入
        const existingBtn = link.nextElementSibling as HTMLElement | null;
        if (existingBtn && existingBtn.classList.contains('deep-profile-btn')) {
          // 如果已有按钮但链接未标记为已注入，标记它并返回
          link.setAttribute("data-deep-profile-injected", "true");
          return;
        }

        const btn = document.createElement("span")
        btn.innerHTML = " 🔍"  // Using innerHTML to properly render emoji
        btn.style.cursor = "pointer"
        btn.style.fontSize = "14px"
        btn.style.marginLeft = "4px"
        btn.style.color = "#8590a6"
        btn.style.verticalAlign = "middle"
        // 最简样式确保与Twitter用户名在同一行
        btn.style.display = "inline-block"
        btn.style.whiteSpace = "nowrap"
        try {
          btn.title = I18nService.t('deep_profile_analysis')
        } catch (e) {
          btn.title = 'Deep Profile Analysis';
          console.warn("Failed to get translation, extension context may be invalidated:", e);
        }
        btn.className = "deep-profile-btn"
        
        btn.onmouseover = () => { btn.style.color = "#0084ff" }
        btn.onmouseout = () => { btn.style.color = "#8590a6" }

        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          // 阻止链接的默认行为，防止Twitter悬停卡片显示
          e.stopImmediatePropagation()
          
          const nickname = link.textContent?.trim() || userId
          
          // Extract context from the current tweet/post
          let contextParts: string[] = [];
          
          // Get tweet content if available - try multiple selectors
          const tweetSelectors = [
            'div[lang]',
            '[data-testid="tweetText"]',
            '[data-testid="tweet"] div[dir="auto"]',
            '.tweet-text',
            '.timeline-Tweet-text'
          ];
          
          let tweetContent = null;
          for (const selector of tweetSelectors) {
            // 查找最近的推文内容
            const closestTweet = link.closest('[data-testid="tweet"], [data-testid="cellInnerDiv"]');
            if (closestTweet) {
              tweetContent = closestTweet.querySelector(selector);
              if (tweetContent) break;
            }
          }
          
          if (tweetContent) {
              contextParts.push(tweetContent.textContent?.substring(0, 100) || "")
          }

          // Get hashtags or topics if available
          const hashtagElements = document.querySelectorAll('a[href*="/hashtag/"]');
          hashtagElements.forEach(tag => {
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
        
        // 使用原始的插入方式，避免复杂逻辑导致的问题
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
      try {
        const config = await ConfigService.getConfig();
        // 添加安全检查，防止config或config.globalEnabled为undefined
        const newEnabled = config?.globalEnabled ?? DEFAULT_CONFIG.globalEnabled;
        
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
      } catch (e) {
        console.warn("Failed to get config, extension context may be invalidated:", e);
      }
    };

    // Initial check
    try {
      checkConfig();
    } catch (e) {
      console.warn("Failed initial config check, extension context may be invalidated:", e);
    }

    // Listen for storage changes to react immediately to options changes
    const storageListener = (changes: any, area: string) => {
      if (area === 'local' && changes['deep_profile_config']) {
        try {
          checkConfig();
        } catch (e) {
          console.warn("Failed to check config in storage listener, extension context may be invalidated:", e);
        }
      }
    };
    
    // Safely add storage listener
    try {
      chrome.storage.onChanged.addListener(storageListener);
    } catch (e) {
      console.warn("Failed to add storage listener, extension context may be invalidated:", e);
    }

    return () => {
      try {
        chrome.storage.onChanged.removeListener(storageListener);
      } catch (e) {
        // 忽略上下文失效错误
        console.debug("Extension context may have been invalidated, ignoring storage listener removal error:", e);
      }
      cleanup();
    };
  }, [])

  const handleAnalyze = async (userId: string, nickname?: string, context?: string, forceRefresh: boolean = false) => {
    // Don't reset the UI state here since we want to keep the overlay visible
    setLoading(true)
    try {
      setStatusMessage(forceRefresh ? I18nService.t('reanalyze') + "..." : I18nService.t('analyzing') + "...")
    } catch (e) {
      setStatusMessage(forceRefresh ? 'Re-analyzing...' : 'Analyzing...');
      console.warn("Failed to get translation, extension context may be invalidated:", e);
    }
    setError(undefined)
    if (forceRefresh) {
        setProfileData(null)
    }
    // Initialize progress to 0 to show the bar immediately
    setProgressPercentage(0)

    try {
      // Safe API call with context validation
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await chrome.runtime.sendMessage({
          type: "ANALYZE_PROFILE",
          userId,
          context, // Send rich context to background
          platform: 'twitter', // Specify platform
          forceRefresh
        })

        if (response.success) {
          setProfileData(response.data)
        } else {
          setError(response.error)
        }
      } else {
        setError(I18nService.t('error_extension_context'));
      }
    } catch (err) {
      // Check if the error is due to context invalidation
      if (err instanceof Error && err.message.includes('Extension context invalidated')) {
        try {
          setError(I18nService.t('error_extension_context'));
        } catch (translationErr) {
          setError('Extension context invalidated. Please refresh the page to retry.');
        }
      } else {
        try {
          setError(I18nService.t('error_network'));
        } catch (translationErr) {
          setError('Network error. Please check your connection.');
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // 从页面中抓取Twitter内容
  const scrapeTwitterContent = async (username: string, limit: number = 15): Promise<any[]> => {
    try {
      // 获取当前页面的URL以确定是否是用户主页
      const currentUrl = window.location.href;
      const contentItems: any[] = [];
      const seenContent = new Set<string>();
      
      // Decode username for better matching
      const decodedUsername = decodeURIComponent(username);
      const usernameLower = username.toLowerCase();
      const decodedUsernameLower = decodedUsername.toLowerCase();
      
      console.log(`Scraping Twitter content for ${username} (${decodedUsername}) on ${currentUrl}`);

      // Helper to check if an element contains user link
      const hasUserLink = (el: Element): boolean => {
          const links = el.querySelectorAll('a');
          for (const link of Array.from(links)) {
              const href = link.getAttribute('href');
              if (href) {
                  const hrefLower = href.toLowerCase();
                  if (hrefLower.includes(`/${usernameLower}`) || 
                      hrefLower.includes(`/${decodedUsernameLower}`)) {
                      return true;
                  }
              }
          }
          return false;
      };

      let attempts = 0;
      const maxAttempts = 8; // Try scrolling a few times
      
      while (contentItems.length < limit && attempts < maxAttempts) {
        // Broad selection of potential item containers
        let containers = Array.from(document.querySelectorAll(
            '[data-testid="tweet"], ' + 
            '[data-testid="cellInnerDiv"], ' + 
            'article[role="article"]'
        ));
        
        for (const container of containers) {
            if (contentItems.length >= limit) break;
            
            // Skip promoted content
            if (container.textContent?.includes('Promoted') || container.querySelector('[data-testid="placementTracking"]')) continue;

            // Must have some text
            if (!container.textContent || container.textContent.length < 10) continue;

            // Determine if this is user's content
            let isUserContent = false;
            
            // If we are on the specific user's profile page
            if (currentUrl.toLowerCase().includes(`/${usernameLower}`) || 
                currentUrl.toLowerCase().includes(`/${decodedUsernameLower}`)) {
                
                // On profile page, we assume content is relevant unless it's clearly someone else's
                // Check for "Retweeted" label or similar indicators if needed
                // But generally, tweets on profile timeline are relevant
                isUserContent = true;
            } else {
                // Not on profile page, must have explicit link/handle match
                // Check if the tweet author is the target user
                const userLink = container.querySelector('[data-testid="User-Name"] a');
                if (userLink) {
                    const href = userLink.getAttribute('href');
                    if (href && (href.toLowerCase().includes(`/${usernameLower}`) || 
                                 href.toLowerCase().includes(`/${decodedUsernameLower}`))) {
                        isUserContent = true;
                    }
                }
            }

            if (!isUserContent) continue;

            // Extract Content
            let content = '';
            const contentEl = container.querySelector('[data-testid="tweetText"]');
            
            if (contentEl) {
                content = contentEl.textContent?.trim() || '';
            } else {
                // Fallback
                const textBlocks = container.querySelectorAll('div[lang]');
                for (const block of Array.from(textBlocks)) {
                    const text = block.textContent?.trim() || '';
                    if (text.length > content.length) {
                        content = text;
                    }
                }
            }

            // Final cleanup
            if (content) {
                // If content is very short, ignore
                if (content.length < 5) continue;
                
                // Safe content hash for deduplication
                const safeContent = content.substring(0, Math.min(100, content.length)).toLowerCase();
                let hash = 0;
                for (let i = 0; i < safeContent.length; i++) {
                    hash = ((hash << 5) - hash) + safeContent.charCodeAt(i);
                    hash |= 0;
                }
                const contentHash = "h" + Math.abs(hash).toString(36);

                if (!seenContent.has(contentHash)) {
                    seenContent.add(contentHash);
                    
                    // Try to find a specific URL for this item
                    let itemUrl = currentUrl;
                    const timeLink = container.querySelector('time')?.closest('a');
                    
                    if (timeLink) itemUrl = timeLink.href;
                    
                    // Check if it's a reply
                    const isReply = container.textContent?.includes('Replying to');
                    
                    // Try to get timestamp
                    let timestamp = Date.now();
                    const timeEl = container.querySelector('time');
                    if (timeEl) {
                        const dt = timeEl.getAttribute('datetime');
                        if (dt) timestamp = new Date(dt).getTime();
                    }
                    
                    contentItems.push({
                        id: `twitter-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        title: isReply ? 'Reply' : 'Tweet',
                        excerpt: content.substring(0, 200),
                        content: content,
                        created_time: timestamp,
                        url: itemUrl,
                        action_type: 'created',
                        type: isReply ? 'answer' : 'article', // Map to generic types
                        is_relevant: true
                    });
                }
            }
        }

        if (contentItems.length >= limit) break;

        // Scroll down to load more content
        console.log(`Found ${contentItems.length}/${limit} items. Scrolling...`);
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 2000)); // Wait for load
        attempts++;
      }
      
      console.log(`Scraped ${contentItems.length} items`);
      return contentItems;
    } catch (error) {
      console.error('Error scraping Twitter content:', error);
      return [];
    }
  };

  // 不渲染任何内容，因为overlay是通过DOM操作渲染的
  // 但是需要返回一个空的div来保持组件挂载，这样按钮注入逻辑才能持续运行
  return <div style={{ display: 'none' }} />;
}

export default TwitterOverlay
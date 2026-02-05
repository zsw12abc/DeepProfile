import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ProfileCard } from "../components/ProfileCard"
import { ConfigService } from "../services/ConfigService"
import { I18nService } from "../services/I18nService"
import type { ZhihuContent, UserProfile, UserHistoryRecord, SupportedPlatform } from "../services/ZhihuClient"
import type { AnalysisProgress, ProfileData } from "../types"
import { DEFAULT_CONFIG } from "../types"
import { createInjectionScheduler } from "./injection-utils"

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
  const [statusMessage, setStatusMessage] = useState(() => {
    try {
      return I18nService.t('loading');
    } catch (e) {
      console.warn("Failed to get translation, extension context may be invalidated:", e);
      return 'Loading...';
    }
  })
  const [progressInfo, setProgressInfo] = useState<AnalysisProgress | undefined>(undefined)
  const [error, setError] = useState<string | undefined>()
  const rootRef = useRef<Root | null>(null)
  const messageListenerRef = useRef<any>(null);

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
        setProgressInfo((prev) => ({
          percentage: prev?.percentage,
          elapsedMs: request.elapsedMs ?? prev?.elapsedMs,
          estimatedMs: request.estimatedMs ?? prev?.estimatedMs,
          overdue: request.overdue ?? prev?.overdue,
          phase: request.phase ?? prev?.phase
        }))
      } else if (request.type === "ANALYSIS_PROGRESS_ESTIMATE") {
        setStatusMessage(request.message)
        setProgressInfo({
          percentage: request.percentage,
          elapsedMs: request.elapsedMs,
          estimatedMs: request.estimatedMs,
          overdue: request.overdue,
          phase: request.phase
        })
      }
    }
    
    // Store reference to remove later
    messageListenerRef.current = messageListener;
    
    // 安全地添加消息监听器
    try {
      chrome.runtime.onMessage.addListener(messageListener)
    } catch (e) {
      console.warn("Failed to add message listener, extension context may be invalidated:", e)
    }
    
    // 安全地清理事件监听器
    return () => {
      try {
        if (messageListenerRef.current) {
          chrome.runtime.onMessage.removeListener(messageListenerRef.current)
          messageListenerRef.current = null;
        }
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
        platform: 'reddit' as SupportedPlatform,
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
            platform={'reddit'}
            isLoading={loading}
            statusMessage={statusMessage}
            progressInfo={progressInfo}
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
  }, [targetUser, profileData, loading, statusMessage, error, initialNickname, currentContext, progressInfo]);

  useEffect(() => {
    let isEnabled = false;
    let storageListenerRef: ((changes: any, area: string) => void) | null = null;

    // 清理函数：停止观察并移除所有已注入的元素
    const cleanup = () => {
      scheduler.stop();
      document.querySelectorAll('.deep-profile-btn').forEach(el => el.remove());
      document.querySelectorAll('[data-deep-profile-injected]').forEach(el => el.removeAttribute('data-deep-profile-injected'));
    };

    // 注入逻辑
    const injectButtons = (root?: ParentNode) => {
      if (!isEnabled || typeof document === 'undefined') return;

      const scope = root && 'querySelectorAll' in root ? root : document;
      const isFullScan = scope === document;

      if (isFullScan) {
        // 1. 清理孤儿按钮
        try {
          document.querySelectorAll('.deep-profile-btn').forEach(btn => {
              const prev = btn.previousElementSibling as HTMLAnchorElement | null;
              if (!prev || prev.tagName !== 'A' || !prev.href.includes('/user/')) {
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
      }

      // 3. 注入新按钮
      let links;
      try {
        links = scope.querySelectorAll('a[href*="/user/"]');
      } catch (e) {
        console.warn('Failed to query user links, document may not be available:', e);
        return; // Exit early if document operations fail
      }
      
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
        btn.innerHTML = "⚡"
        btn.style.cursor = "pointer"
        btn.style.fontSize = "12px"
        btn.style.marginLeft = "6px"
        btn.style.color = "#2563eb"
        btn.style.verticalAlign = "middle"
        btn.style.display = "inline-flex"
        btn.style.alignItems = "center"
        btn.style.justifyContent = "center"
        btn.style.width = "22px"
        btn.style.height = "22px"
        btn.style.borderRadius = "999px"
        btn.style.border = "1px solid rgba(37, 99, 235, 0.25)"
        btn.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(34, 211, 238, 0.18))"
        btn.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.18)"
        btn.style.transition = "all 0.2s ease"
        try {
          btn.title = I18nService.t('deep_profile_analysis')
        } catch (e) {
          btn.title = 'Deep Profile Analysis';
          console.warn("Failed to get translation, extension context may be invalidated:", e);
        }
        btn.className = "deep-profile-btn"
        
        btn.onmouseover = () => {
          btn.style.color = "#ffffff"
          btn.style.background = "linear-gradient(135deg, #2563eb, #22d3ee)"
          btn.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.35)"
          btn.style.transform = "translateY(-1px)"
        }
        btn.onmouseout = () => {
          btn.style.color = "#2563eb"
          btn.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(34, 211, 238, 0.18))"
          btn.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.18)"
          btn.style.transform = "translateY(0)"
        }

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
            'div[data-adclicklocation="title"]',
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

    const scheduler = createInjectionScheduler({
      injectButtons,
      shouldProcess: () => isEnabled,
      debounceMs: 200
    });

    const startInjection = () => {
      const root = document.body || document.documentElement;
      if (!root) return;
      scheduler.start(root);
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
        } else if (isEnabled) {
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
    
    // Store reference to remove later
    storageListenerRef = storageListener;
    
    // Safely add storage listener
    try {
      chrome.storage.onChanged.addListener(storageListener);
    } catch (e) {
      console.warn("Failed to add storage listener, extension context may be invalidated:", e);
    }

    return () => {
      try {
        if (storageListenerRef) {
          chrome.storage.onChanged.removeListener(storageListenerRef);
          storageListenerRef = null;
        }
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
    setProgressInfo({
      percentage: 0,
      elapsedMs: 0,
      estimatedMs: undefined,
      overdue: false,
      phase: 'estimate'
    })

    try {
      // Safe API call with context validation
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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

  // 不渲染任何内容，因为overlay是通过DOM操作渲染的
  // 但是需要返回一个空的div来保持组件挂载，这样按钮注入逻辑才能持续运行
  return <div style={{ display: 'none' }} />;
}

export default RedditOverlay

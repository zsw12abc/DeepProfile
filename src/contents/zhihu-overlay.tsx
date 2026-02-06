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
  const [statusMessage, setStatusMessage] = useState(I18nService.t('loading'))
  const [progressInfo, setProgressInfo] = useState<AnalysisProgress | undefined>(undefined)
  const [error, setError] = useState<string | undefined>()
  const rootRef = useRef<Root | null>(null)
  const messageListenerRef = useRef<any>(null);

  useEffect(() => {
    // Initialize I18n
    I18nService.init();

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
    
    chrome.runtime.onMessage.addListener(messageListener)
    
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
      
      // 如果还没有创建root，就创建一个新的
      if (!rootRef.current) {
        rootRef.current = createRoot(container);
      }
      
      // 准备ProfileCard所需的数据结构
      const recordData = {
        userId: targetUser,
        platform: 'zhihu' as SupportedPlatform,
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
      rootRef.current.render(
        <ProfileCard
          record={recordData}
          platform={'zhihu'}
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
      }

      // 3. 注入新按钮
      const links = scope.querySelectorAll('a[href*="www.zhihu.com/people/"]')
      
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
        btn.innerText = "⚡"
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
        btn.title = "DeepProfile Analysis"
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
          // 设置目标用户并触发分析
          setTargetUser(userId)
          setInitialNickname(nickname)
          setCurrentContext(richContext)
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
      const config = await ConfigService.getConfig();
      const globalEnabled = config?.globalEnabled ?? DEFAULT_CONFIG.globalEnabled;
      const buttonEnabled = config?.platformConfigs?.zhihu?.analysisButtonEnabled 
        ?? DEFAULT_CONFIG.platformConfigs.zhihu.analysisButtonEnabled 
        ?? true;
      const newEnabled = globalEnabled && buttonEnabled;
      
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
    };

    // Initial check
    checkConfig();

    // Listen for storage changes to react immediately to options changes
    const storageListener = (changes: any, area: string) => {
      if (area === 'local' && changes['deep_profile_config']) {
        checkConfig();
      }
    };
    
    // Store reference to remove later
    storageListenerRef = storageListener;
    
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      try {
        if (storageListenerRef) {
          chrome.storage.onChanged.removeListener(storageListenerRef);
          storageListenerRef = null;
        }
      } catch (e) {
        // 忽略上下文失效错误
        console.debug("Extension context may have been invalidated, ignoring error:", e)
      }
      cleanup();
    };
  }, [])

  const handleAnalyze = async (userId: string, nickname?: string, context?: string, forceRefresh: boolean = false) => {
    setTargetUser(userId)
    setInitialNickname(nickname)
    setCurrentContext(context)
    setLoading(true)
    setStatusMessage(forceRefresh ? I18nService.t('reanalyze') + "..." : I18nService.t('analyzing') + "...")
    setError(undefined)
    // Always clear profile data to ensure loading state is shown for new searches
    setProfileData(null)
    // Initialize progress to 0 to show the bar immediately
    setProgressInfo({
      percentage: 0,
      elapsedMs: 0,
      estimatedMs: undefined,
      overdue: false,
      phase: 'estimate'
    })

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
      setError(I18nService.t('error_network'))
    } finally {
      setLoading(false)
    }
  }

  // 不渲染任何内容，因为overlay是通过DOM操作渲染的
  // 但是需要返回一个空的div来保持组件挂载，这样按钮注入逻辑才能持续运行
  return <div style={{ display: 'none' }} />;
}

export default ZhihuOverlay

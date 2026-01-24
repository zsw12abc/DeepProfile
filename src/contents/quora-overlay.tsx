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
  matches: ["https://www.quora.com/profile/*", "https://www.quora.com/*"]
}

const QuoraOverlay = () => {
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
        platform: 'quora' as SupportedPlatform,
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
            platform={'quora'}
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
    const handleMessageFromBackground = (request: any, sender: any, sendResponse: (response: any) => void) => {
      if (request && request.type === 'QUORA_CONTENT_REQUEST') {
        const { requestId, username, limit, url } = request;
        
        // 从页面中抓取Quora内容
        const scrapedContent = scrapeQuoraContent(username, limit);
        
        // 发送响应回后台脚本
        chrome.runtime.sendMessage({
          type: 'QUORA_CONTENT_RESPONSE',
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
            if (!prev || prev.tagName !== 'A' || !prev.href.includes('/profile/')) {
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
      let links;
      try {
        links = document.querySelectorAll('a[href*="/profile/"]');
      } catch (e) {
        console.warn('Failed to query user links, document may not be available:', e);
        return; // Exit early if document operations fail
      }
      
      links.forEach((element) => {
        const link = element as HTMLAnchorElement
        if (link.getAttribute("data-deep-profile-injected")) return
        
        const href = link.href
        // 提取Quora用户名
        const match = href.match(/\/profile\/([^\/\?#]+)/i)
        if (!match) return
        
        const userId = match[1]

        if (!userId || userId === 'search' || userId === 'notifications' || userId === 'following' || 
            userId === 'followers' || userId === 'following_topics' || userId === 'following_collections' ||
            userId === 'following_blogs' || userId === 'following_questions' || userId === 'following_posts' ||
            userId === 'logs' || userId === 'badges' || userId === 'edits' || userId === 'answers' ||
            userId === 'questions' || userId === 'posts' || userId === 'content') return
        if (link.querySelector('img')) return
        if (!link.textContent?.trim()) return
        if (link.closest('.profile_photo') || link.closest('[aria-label*="photo"]')) return

        const btn = document.createElement("span")
        btn.innerHTML = " 🔍"  // Using innerHTML to properly render emoji
        btn.style.cursor = "pointer"
        btn.style.fontSize = "14px"
        btn.style.marginLeft = "4px"
        btn.style.color = "#8590a6"
        btn.style.verticalAlign = "middle"
        btn.style.display = "inline-block"
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
          
          // 阻止链接的默认行为，防止Quora悬停卡片显示
          e.stopImmediatePropagation()
          
          const nickname = link.textContent?.trim()
          
          // Extract context from the current question/answer
          let contextParts: string[] = [];
          
          // Get question title if available - try multiple selectors
          const questionSelectors = [
            'div.q-text span',
            'div.q-text',
            'h1.q-text',
            '.qu-word-break--break-word',
            '[data-testid="post_page_main_content"] .qu-word-break--break-word',
            '.pagedlist_item .qu-word-break--break-word'
          ];
          
          let questionTitle = null;
          for (const selector of questionSelectors) {
            questionTitle = document.querySelector(selector);
            if (questionTitle) break;
          }
          
          if (questionTitle) {
              contextParts.push(questionTitle.textContent?.trim() || "")
          }

          // Get topic tags if available
          const topicElements = document.querySelectorAll('a[href*="/topic/"], span.q-box a, .qu-display--inline a');
          topicElements.forEach(topic => {
            const topicText = topic.textContent?.trim();
            if (topicText && !contextParts.includes(topicText) && topicText.length > 2) {
              contextParts.push(topicText);
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
          platform: 'quora', // Specify platform
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

  // 从页面中抓取Quora内容
  const scrapeQuoraContent = (username: string, limit: number = 15): any[] => {
    try {
      // 获取当前页面的URL以确定是否是用户主页
      const currentUrl = window.location.href;
      const contentItems: any[] = [];
      const seenContent = new Set<string>();
      
      console.log(`Scraping Quora content for ${username} on ${currentUrl}`);

      // Helper to check if an element contains user link
      const hasUserLink = (el: Element, user: string): boolean => {
          const links = el.querySelectorAll('a');
          const userLower = user.toLowerCase();
          for (const link of Array.from(links)) {
              const href = link.getAttribute('href');
              if (href && (href.toLowerCase().includes(`/profile/${userLower}`) || href.toLowerCase().includes(`/answer/${userLower}`))) {
                  return true;
              }
          }
          // Also check images with alt text containing username (fuzzy match)
          const imgs = el.querySelectorAll('img');
          const namePart = user.split('-')[0].toLowerCase();
          for (const img of Array.from(imgs)) {
              if (img.alt && img.alt.toLowerCase().includes(namePart)) {
                  return true;
              }
          }
          return false;
      };

      // Selectors for answer containers
      // We prioritize q-click-wrapper as requested, but also look for other common containers
      const containers = document.querySelectorAll('.q-click-wrapper, .pagedlist_item, .dom_annotate_question_answer_item');
      
      for (const container of Array.from(containers)) {
          if (contentItems.length >= limit) break;
          
          // Must have some text
          if (!container.textContent || container.textContent.length < 10) continue;

          // Check if this container holds an answer
          // Look for the answer content class provided by user
          let contentEl = container.querySelector('.puppeteer_test_answer_content');
          
          // Fallback selectors if the specific test class is missing
          if (!contentEl) {
              contentEl = container.querySelector('.spacing_log_answer_content');
          }
          if (!contentEl) {
              // Try finding a q-text block that looks like an answer (long text)
              const textBlocks = container.querySelectorAll('.q-text');
              for (const block of Array.from(textBlocks)) {
                  if (block.textContent && block.textContent.length > 50) {
                      // Avoid titles
                      if (!block.classList.contains('puppeteer_test_question_title') && 
                          !block.classList.contains('qu-fontWeight--bold')) {
                          contentEl = block;
                          break;
                      }
                  }
              }
          }

          if (!contentEl) continue;

          // Verify it belongs to the user
          let isUserContent = false;
          let itemUrl = currentUrl;

          if (hasUserLink(container, username)) {
              isUserContent = true;
              // Try to find specific answer link
              const answerLink = container.querySelector(`a[href*="/answer/${username}"]`) as HTMLAnchorElement;
              if (answerLink) itemUrl = answerLink.href;
          } else if (currentUrl.includes('/answers') || currentUrl.includes('/profile/' + username)) {
              // If we are on the user's profile/answers page, and the structure looks like an answer, assume it is theirs
              // unless we find a link to ANOTHER user
              const otherUserLink = Array.from(container.querySelectorAll('a[href*="/profile/"]')).find(a => {
                  const href = a.getAttribute('href') || '';
                  return !href.toLowerCase().includes(username.toLowerCase());
              });
              
              // If there are no links to other users in the header area, it's likely the profile owner's content
              // But be careful, comments might link to others.
              // We check if the "header" part contains other users.
              const header = container.querySelector('.spacing_log_answer_header');
              if (header) {
                   const headerLinks = header.querySelectorAll('a[href*="/profile/"]');
                   let hasOtherUser = false;
                   for (const hl of Array.from(headerLinks)) {
                       if (!hl.getAttribute('href')?.toLowerCase().includes(username.toLowerCase())) {
                           hasOtherUser = true;
                           break;
                       }
                   }
                   if (!hasOtherUser) isUserContent = true;
              } else {
                  // If no header found, but we are on /answers page and found content, assume yes
                  if (currentUrl.includes('/answers')) isUserContent = true;
              }
          }

          if (!isUserContent) continue;

          // Extract Title
          let title = 'Answer';
          const titleEl = container.querySelector('.puppeteer_test_question_title') || 
                          container.querySelector('.q-text.qu-fontWeight--bold');
          if (titleEl) title = titleEl.textContent?.trim() || title;

          // Extract Content
          let content = contentEl.textContent?.trim() || '';
          // Try to get cleaner text from q-text inside
          const richTextEl = contentEl.querySelector('.q-text');
          if (richTextEl) content = richTextEl.textContent?.trim() || content;

          if (content && content.length > 10) {
              const contentHash = btoa(content.substring(0, Math.min(100, content.length)).toLowerCase()).substring(0, 20);
              if (!seenContent.has(contentHash)) {
                  seenContent.add(contentHash);
                  contentItems.push({
                      id: `quora-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      title: title,
                      excerpt: content.substring(0, 200),
                      content: content,
                      created_time: Date.now(),
                      url: itemUrl,
                      action_type: 'created',
                      type: 'answer',
                      is_relevant: true
                  });
              }
          }
      }
      
      console.log(`Scraped ${contentItems.length} items`);
      return contentItems;
    } catch (error) {
      console.error('Error scraping Quora content:', error);
      return [];
    }
  };

  // 计算两个字符串的相似度
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = computeEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // 计算编辑距离（Levenshtein距离）
  const computeEditDistance = (s1: string, s2: string): number => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  };
  
  return <div style={{ display: 'none' }} />;
}

export default QuoraOverlay
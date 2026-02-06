import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import type { CommentItem, CommentAnalysisResult } from "~types"
import { I18nService } from "~services/I18nService"
import { ConfigService } from "~services/ConfigService"
import { DEFAULT_CONFIG } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"]
}

// 嵌入式 UI 组件
const CommentAnalysisPanel = ({ contextTitle, containerElement, answerId }: { contextTitle: string, containerElement: Element, answerId?: string }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(I18nService.t('analyzing_comments'));
  const [result, setResult] = useState<CommentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); // 默认折叠核心观点

  useEffect(() => {
    // 初始化语言
    I18nService.init();

    const analyze = async () => {
      try {
        // 0. 检查是否需要展开评论
        const expandBtn = Array.from(containerElement.querySelectorAll('div, button')).find(el => 
            (el.textContent?.includes('点击查看全部评论') || el.textContent?.includes('展开更多评论')) && 
            (el as HTMLElement).offsetParent !== null 
        ) as HTMLElement;

        if (expandBtn) {
            setStatus(I18nService.t('expanding_comments'));
            expandBtn.click();
            
            await new Promise<void>((resolve) => {
                let attempts = 0;
                const maxAttempts = 30; 
                const interval = setInterval(() => {
                    attempts++;
                    const contentCount = containerElement.querySelectorAll('.CommentContent').length;
                    const btnStillVisible = document.body.contains(expandBtn) && expandBtn.offsetParent !== null;

                    if (contentCount > 5 || !btnStillVisible || attempts >= maxAttempts) {
                        clearInterval(interval);
                        setTimeout(() => resolve(), 500); 
                    }
                }, 100);
            });
        }

        setStatus(I18nService.t('extracting_comments'));

        // 1. 提取 DOM
        const comments: CommentItem[] = [];
        const contentElements = containerElement.querySelectorAll('.CommentContent');
        
        contentElements.forEach((contentEl, index) => {
            const text = contentEl.textContent || "";
            if (!text.trim()) return;

            const itemContainer = contentEl.closest('[data-id]') || contentEl.closest('li') || contentEl.parentElement?.parentElement;
            
            let author = I18nService.t('anonymous_user');
            let likes = 0;

            if (itemContainer) {
                const authorEl = itemContainer.querySelector('.UserLink-link') || 
                                 itemContainer.querySelector('a[href*="/people/"]') ||
                                 itemContainer.querySelector('.css-10u695f'); 
                
                if (authorEl) {
                    author = authorEl.textContent || I18nService.t('anonymous_user');
                }

                const likeBtn = Array.from(itemContainer.querySelectorAll('button')).find(btn => 
                    btn.querySelector('.ZDI--HeartFill24') || 
                    btn.textContent?.includes('赞同') ||
                    btn.getAttribute('aria-label')?.includes('赞同')
                );

                if (likeBtn) {
                    const likeText = likeBtn.textContent?.replace(/[^\d]/g, '') || "0";
                    likes = parseInt(likeText) || 0;
                }
            }

            comments.push({
                id: `local-${index}`,
                author,
                content: text,
                likes
            });
        });

        console.log(`[DeepProfile] Extracted ${comments.length} comments from container.`);

        if (comments.length < 3) {
            throw new Error(`${I18nService.t('not_enough_comments')} (${comments.length}${I18nService.t('comment_analysis_instruction')}`);
        }

        // 1.5 提取上下文内容 (回答/文章正文)
        let contextContent = "";
        try {
            // 尝试从 container 往上找
            let contentContainer = containerElement.closest('.ContentItem') || containerElement.closest('.Post-content');
            
            if (contentContainer) {
                const richContent = contentContainer.querySelector('.RichContent-inner') || contentContainer.querySelector('.Post-RichText');
                if (richContent) {
                    contextContent = richContent.textContent || "";
                }
            } else {
                // 尝试全局查找 (仅当页面上只有一个主要内容时有效，或者作为兜底)
                if (window.location.href.includes('/answer/') || window.location.href.includes('/p/')) {
                     const mainContent = document.querySelector('.RichContent-inner') || document.querySelector('.Post-RichText');
                     if (mainContent) {
                         contextContent = mainContent.textContent || "";
                     }
                }
            }
            
            if (contextContent) {
                console.log(`[DeepProfile] Extracted context content length: ${contextContent.length}`);
            }
        } catch (e) {
            console.warn("[DeepProfile] Failed to extract context content:", e);
        }

        setStatus(I18nService.t('ai_reading'));

        // 2. 调用 Service
        try {
          const response = await chrome.runtime.sendMessage({
            type: "ANALYZE_COMMENTS",
            comments,
            contextTitle,
            contextContent, // 传递提取的内容
            answerId, // 传递 answerId 作为 fallback
            language: I18nService.getLanguage() // 传递当前语言设置
          });
          
          if (response.success) {
            console.log("[DeepProfile] Received analysis result:", response.data);
            setResult(response.data);
          } else {
            throw new Error(response.error);
          }
        } catch (e: any) {
          if (e.message && (e.message.includes('Extension context invalidated') || e.message.includes('extension context invalidated'))) {
            console.error("[DeepProfile] Extension context invalidated, please refresh the page");
            setError(I18nService.t('extension_context_invalidated'));
          } else {
            throw e;
          }
        }
      } catch (e: any) {
        console.error("[DeepProfile] Analysis failed:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, []);

  if (error) {
      if (error.includes('Extension context invalidated') || error === I18nService.t('extension_context_invalidated')) {
          return (
              <div style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, marginBottom: 12, fontSize: 13, color: '#b91c1c', boxShadow: '0 10px 24px rgba(239, 68, 68, 0.12)' }}>
                  <strong>{I18nService.t('extension_context_invalidated_title')}：</strong> {I18nService.t('extension_context_invalidated_desc')}
              </div>
          )
      } else {
          return (
              <div style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, marginBottom: 12, fontSize: 13, color: '#b91c1c', boxShadow: '0 10px 24px rgba(239, 68, 68, 0.12)' }}>
                  <strong>{I18nService.t('comment_analysis_failed')}：</strong> {error}
              </div>
          )
      }
  }

  if (loading) {
      return (
          <div style={{ padding: '14px 16px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.35)', borderRadius: 12, marginBottom: 12, fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'center', boxShadow: '0 10px 24px rgba(37, 99, 235, 0.12)' }}>
              <div style={{ marginRight: 10, width: 16, height: 16, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              {status}
          </div>
      )
  }

  if (!result) return null;

  return (
    <div style={{ padding: '18px', background: 'linear-gradient(180deg, #ffffff, #f7fbff)', borderRadius: 16, marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {I18nService.t('comment_analysis_summary')}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', marginLeft: 8, background: 'rgba(37, 99, 235, 0.12)', padding: '4px 8px', borderRadius: 999, letterSpacing: '0.02em' }}>{I18nService.t('comment_analysis_ai_generated')}</span>
              </h3>
              <div style={{ fontSize: 14, lineHeight: '1.6', color: '#0f172a' }}>
                  {result.summary}
              </div>
          </div>
      </div>

      <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 6, background: '#e2e8f0' }}>
              <div style={{ width: `${(result.stance_ratio?.support || 0) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} title={`${I18nService.t('sentiment_support')} ${Math.round((result.stance_ratio?.support || 0) * 100)}%`} />
              <div style={{ width: `${(result.stance_ratio?.neutral || 0) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} title={`${I18nService.t('sentiment_neutral')} ${Math.round((result.stance_ratio?.neutral || 0) * 100)}%`} />
              <div style={{ width: `${(result.stance_ratio?.oppose || 0) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} title={`${I18nService.t('sentiment_oppose')} ${Math.round((result.stance_ratio?.oppose || 0) * 100)}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 4 }}></span>{I18nService.t('sentiment_support')} {Math.round((result.stance_ratio?.support || 0) * 100)}%</span>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: 4 }}></span>{I18nService.t('sentiment_neutral')} {Math.round((result.stance_ratio?.neutral || 0) * 100)}%</span>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 4 }}></span>{I18nService.t('sentiment_oppose')} {Math.round((result.stance_ratio?.oppose || 0) * 100)}%</span>
          </div>
      </div>

      <div>
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
                fontSize: 13, 
                color: '#64748b', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center',
                userSelect: 'none'
            }}
          >
              {isExpanded ? I18nService.t('collapse_key_points') : I18nService.t('expand_key_points')}
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                style={{ marginLeft: 4, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                  <path d="M12 16L6 10H18L12 16Z" />
              </svg>
          </div>
          
          {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                  {result.key_points && result.key_points.map((point, i) => (
                      <div key={i} style={{ marginBottom: 12, fontSize: 13 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>
                              {point.type === 'support' ? '🟢' : point.type === 'oppose' ? '🔴' : '⚪'} {point.point}
                          </div>
                          {point.example_quotes && point.example_quotes.map((quote, j) => (
                              <div key={j} style={{ fontSize: 12, color: '#64748b', paddingLeft: 10, borderLeft: '3px solid #e2e8f0', marginTop: 4, fontStyle: 'italic' }}>
                                  "{quote}"
                              </div>
                          ))}
                      </div>
                  ))}
                  {result.deep_analysis && result.deep_analysis.has_fallacy && (
                    <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>
                            {I18nService.t('deep_insight')}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            {`${I18nService.t('logic_fallacy')}: ${result.deep_analysis.fallacy_type || I18nService.t('unknown_type')}`}
                            {result.deep_analysis.example && ` (${I18nService.t('example_quote')}: "${result.deep_analysis.example}")`}
                        </div>
                    </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

// 注入逻辑
const ZhihuComments = () => {
    useEffect(() => {
        let isEnabled = false;
        let storageListenerRef: ((changes: any, area: string) => void) | null = null;

        I18nService.init();

        const cleanup = () => {
            document.querySelectorAll('.deep-profile-summary-btn').forEach(el => el.remove());
            document.querySelectorAll('.deep-profile-embedded-panel').forEach(el => el.remove());
        };

        const injectButton = () => {
            if (!isEnabled || typeof document === 'undefined') return;
            // 适配页面内评论区和弹窗评论区
            const containers = document.querySelectorAll('.Comments-container, .Modal-content');
            
            containers.forEach(container => {
                // 1. 寻找 Header
                let header: HTMLElement | null = null;
                let sortContainer: HTMLElement | null = null;

                // 优先使用更具体的选择器
                header = container.querySelector('.css-1onritu') || 
                         container.querySelector('.CommentListV2-header') || 
                         container.querySelector('.Comments-header') as HTMLElement;

                // 如果找不到，再使用基于内容的通用查找
                if (!header) {
                    const children = Array.from(container.children) as HTMLElement[];
                    for (const child of children) {
                        if (child.innerText.includes('默认') && child.innerText.includes('最新')) {
                            header = child;
                            break;
                        }
                    }
                }

                if (!header) return; 

                // 在 header 内部找到排序容器
                sortContainer = Array.from(header.querySelectorAll('div')).find(d => d.innerText.includes('默认') && d.innerText.includes('最新')) as HTMLElement;

                // 检查是否已经有面板在运行
                if (container.querySelector('.deep-profile-embedded-panel')) return;

                // 检查按钮是否已存在
                if (header.querySelector('.deep-profile-summary-btn')) return;

                const btn = document.createElement('button');
                btn.className = 'Button deep-profile-summary-btn';
                btn.innerText = I18nService.t('comment_summary_btn');
                btn.style.marginLeft = '12px';
                btn.style.marginRight = '12px';
                btn.style.border = '1px solid rgba(37, 99, 235, 0.35)';
                btn.style.color = '#2563eb';
                btn.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(34, 211, 238, 0.14))';
                btn.style.borderRadius = '999px';
                btn.style.padding = '0 14px';
                btn.style.fontSize = '12px';
                btn.style.height = '30px';
                btn.style.lineHeight = '28px';
                btn.style.cursor = 'pointer';
                btn.style.fontWeight = '600';
                btn.style.boxShadow = '0 8px 18px rgba(37, 99, 235, 0.18)';
                btn.style.transition = 'all 0.2s ease';
                
                btn.onmouseover = () => { 
                    btn.style.background = 'linear-gradient(135deg, #2563eb, #22d3ee)'; 
                    btn.style.color = '#ffffff';
                    btn.style.boxShadow = '0 10px 24px rgba(37, 99, 235, 0.3)';
                    btn.style.transform = 'translateY(-1px)';
                };
                btn.onmouseout = () => { 
                    btn.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(34, 211, 238, 0.14))'; 
                    btn.style.color = '#2563eb';
                    btn.style.boxShadow = '0 8px 18px rgba(37, 99, 235, 0.18)';
                    btn.style.transform = 'translateY(0)';
                };
                
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    
                    // 创建嵌入面板的容器
                    const panelContainer = document.createElement('div');
                    panelContainer.className = 'deep-profile-embedded-panel';
                    
                    // 插入位置：Header 之后
                    if (header && header.parentNode) {
                        header.parentNode.insertBefore(panelContainer, header.nextSibling);
                    } else {
                        // 这是一个 fallback，理论上不应该发生
                        container.insertBefore(panelContainer, container.firstChild);
                    }
                    
                    // 隐藏按钮
                    btn.style.display = 'none';

                    // 获取当前上下文标题
                    let title = "";
                    const questionHeader = document.querySelector('.QuestionHeader-title');
                    if (questionHeader) title = questionHeader.textContent || "";
                    
                    // 尝试获取 answerId
                    let answerId = undefined;
                    // 1. 从 URL 获取
                    const urlMatch = window.location.href.match(/answer\/(\d+)/);
                    if (urlMatch) {
                        answerId = urlMatch[1];
                    } else {
                        // 2. 从 DOM 获取 (RichContent 容器通常包含 data-zop 属性，里面有 itemId)
                        const richContent = container.closest('.ContentItem') || document.querySelector('.RichContent');
                        if (richContent) {
                            // 尝试查找 data-zop 属性
                            const dataZop = richContent.getAttribute('data-zop');
                            if (dataZop) {
                                try {
                                    const zopData = JSON.parse(dataZop);
                                    if (zopData.itemId) {
                                        answerId = String(zopData.itemId);
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            }
                            
                            // 如果没有 data-zop，尝试查找 meta 标签
                            if (!answerId) {
                                const meta = richContent.querySelector('meta[itemprop="url"]');
                                if (meta) {
                                    const content = meta.getAttribute('content');
                                    const match = content?.match(/answer\/(\d+)/);
                                    if (match) {
                                        answerId = match[1];
                                    }
                                }
                            }
                        }
                    }

                    const root = createRoot(panelContainer);
                    root.render(<CommentAnalysisPanel 
                        contextTitle={title} 
                        containerElement={container}
                        answerId={answerId}
                    />);
                };

                if (sortContainer) {
                    header.insertBefore(btn, sortContainer);
                } else {
                    header.appendChild(btn);
                }
            });
        };

        const observer = new MutationObserver(() => {
            if (isEnabled) {
                injectButton();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const checkConfig = async () => {
            try {
                const config = await ConfigService.getConfig();
                const globalEnabled = config?.globalEnabled ?? DEFAULT_CONFIG.globalEnabled;
                const commentEnabled = config?.platformConfigs?.zhihu?.commentAnalysisEnabled 
                    ?? DEFAULT_CONFIG.platformConfigs.zhihu.commentAnalysisEnabled 
                    ?? true;
                const newEnabled = globalEnabled && commentEnabled;

                if (newEnabled !== isEnabled) {
                    isEnabled = newEnabled;
                    if (isEnabled) {
                        injectButton();
                    } else {
                        cleanup();
                    }
                } else if (isEnabled) {
                    injectButton();
                }
            } catch (e) {
                console.warn("[DeepProfile] Failed to read config for comment analysis:", e);
            }
        };

        checkConfig();

        const storageListener = (changes: any, area: string) => {
            if (area === 'local' && changes['deep_profile_config']) {
                checkConfig();
            }
        };
        storageListenerRef = storageListener;
        chrome.storage.onChanged.addListener(storageListener);

        return () => {
            observer.disconnect();
            try {
                if (storageListenerRef) {
                    chrome.storage.onChanged.removeListener(storageListenerRef);
                    storageListenerRef = null;
                }
            } catch (e) {
                console.debug("[DeepProfile] Failed to remove config listener:", e);
            }
            cleanup();
        };
    }, []);

    return null;
}

export default ZhihuComments

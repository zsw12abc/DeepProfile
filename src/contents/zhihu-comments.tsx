import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import type { CommentItem, CommentAnalysisResult } from "~types"
import { I18nService } from "~services/I18nService"

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

      } catch (e) {
        console.error("[DeepProfile] Analysis failed:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, []);

  if (error) {
      return (
          <div style={{ padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4, marginBottom: 12, fontSize: 13, color: '#cf1322' }}>
              <strong>{I18nService.t('comment_analysis_failed')}：</strong> {error}
          </div>
      )
  }

  if (loading) {
      return (
          <div style={{ padding: '12px 16px', background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 4, marginBottom: 12, fontSize: 13, color: '#2f54eb', display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: 8, width: 16, height: 16, border: '2px solid #2f54eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              {status}
          </div>
      )
  }

  if (!result) return null;

  return (
    <div style={{ padding: '16px', background: '#f6f6f6', borderRadius: 8, marginBottom: 16, border: '1px solid #ebebeb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  📊 {I18nService.t('comment_analysis_summary')}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#8590a6', marginLeft: 8, background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{I18nService.t('comment_analysis_ai_generated')}</span>
              </h3>
              <div style={{ fontSize: 14, lineHeight: '1.6', color: '#121212' }}>
                  {result.summary}
              </div>
          </div>
      </div>

      <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${(result.stance_ratio?.support || 0) * 100}%`, background: '#52c41a' }} title={`${I18nService.t('sentiment_support')} ${Math.round((result.stance_ratio?.support || 0) * 100)}%`} />
              <div style={{ width: `${(result.stance_ratio?.neutral || 0) * 100}%`, background: '#faad14' }} title={`${I18nService.t('sentiment_neutral')} ${Math.round((result.stance_ratio?.neutral || 0) * 100)}%`} />
              <div style={{ width: `${(result.stance_ratio?.oppose || 0) * 100}%`, background: '#ff4d4f' }} title={`${I18nService.t('sentiment_oppose')} ${Math.round((result.stance_ratio?.oppose || 0) * 100)}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8590a6' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', marginRight: 4 }}></span>{I18nService.t('sentiment_support')} {Math.round((result.stance_ratio?.support || 0) * 100)}%</span>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#faad14', marginRight: 4 }}></span>{I18nService.t('sentiment_neutral')} {Math.round((result.stance_ratio?.neutral || 0) * 100)}%</span>
              <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f', marginRight: 4 }}></span>{I18nService.t('sentiment_oppose')} {Math.round((result.stance_ratio?.oppose || 0) * 100)}%</span>
          </div>
      </div>

      <div>
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
                fontSize: 13, 
                color: '#8590a6', 
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
              <div style={{ marginTop: 12, borderTop: '1px solid #ebebeb', paddingTop: 12 }}>
                  {result.key_points && result.key_points.map((point, i) => (
                      <div key={i} style={{ marginBottom: 12, fontSize: 13 }}>
                          <div style={{ fontWeight: 500, marginBottom: 4, color: '#444' }}>
                              {point.type === 'support' ? '🟢' : point.type === 'oppose' ? '🔴' : '⚪'} {point.point}
                          </div>
                          {point.example_quotes && point.example_quotes.map((quote, j) => (
                              <div key={j} style={{ fontSize: 12, color: '#8590a6', paddingLeft: 10, borderLeft: '3px solid #eee', marginTop: 4, fontStyle: 'italic' }}>
                                  "{quote}"
                              </div>
                          ))}
                      </div>
                  ))}
                  {result.deep_analysis && result.deep_analysis.has_fallacy && (
                    <div style={{ marginTop: 12, borderTop: '1px solid #ebebeb', paddingTop: 12, fontSize: 13 }}>
                        <div style={{ fontWeight: 500, marginBottom: 4, color: '#444' }}>
                            {I18nService.t('deep_insight')}
                        </div>
                        <div style={{ fontSize: 12, color: '#8590a6' }}>
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
        const injectButton = () => {
            // 适配页面内评论区和弹窗评论区
            const containers = document.querySelectorAll('.Comments-container, .Modal-content');
            
            containers.forEach(container => {
                // 1. 寻找 Header
                let header: HTMLElement | null = null;
                let sortContainer: HTMLElement | null = null;

                // 优先使用更具体的选择器
                header = container.querySelector('.css-1onritu') || 
                         container.querySelector('.CommentListV2-header') || 
                         container.querySelector('.Comments-header');

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
                btn.style.border = '1px solid #0084ff';
                btn.style.color = '#0084ff';
                btn.style.background = 'transparent';
                btn.style.borderRadius = '4px';
                btn.style.padding = '0 12px';
                btn.style.fontSize = '12px';
                btn.style.height = '28px';
                btn.style.lineHeight = '26px';
                btn.style.cursor = 'pointer';
                btn.style.fontWeight = '500';
                
                btn.onmouseover = () => { btn.style.background = 'rgba(0, 132, 255, 0.08)'; };
                btn.onmouseout = () => { btn.style.background = 'transparent'; };
                
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    
                    // 创建嵌入面板的容器
                    const panelContainer = document.createElement('div');
                    panelContainer.className = 'deep-profile-embedded-panel';
                    
                    // 插入位置：Header 之后
                    if (header.parentNode) {
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

        const observer = new MutationObserver(injectButton);
        observer.observe(document.body, { childList: true, subtree: true });
        
        injectButton();
        
        return () => observer.disconnect();
    }, []);

    return null;
}

export default ZhihuComments
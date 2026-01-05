import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { CommentAnalysisService } from "~services/CommentAnalysisService"
import type { CommentItem, CommentAnalysisResult } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"]
}

// 简单的 UI 组件
const CommentAnalysisPanel = ({ onClose, contextTitle, containerElement }: { onClose: () => void, contextTitle: string, containerElement: Element }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("正在分析当前页面的评论...");
  const [result, setResult] = useState<CommentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyze = async () => {
      try {
        // 0. 检查是否需要展开评论
        const expandBtn = Array.from(containerElement.querySelectorAll('div, button')).find(el => 
            (el.textContent?.includes('点击查看全部评论') || el.textContent?.includes('展开更多评论')) && 
            (el as HTMLElement).offsetParent !== null // 确保可见
        ) as HTMLElement;

        if (expandBtn) {
            setStatus("正在展开评论区...");
            expandBtn.click();
            
            // 等待评论加载
            await new Promise<void>((resolve) => {
                let attempts = 0;
                const maxAttempts = 30; // 3 seconds
                const interval = setInterval(() => {
                    attempts++;
                    const contentCount = containerElement.querySelectorAll('.CommentContent').length;
                    
                    // 如果评论数增加了，或者按钮消失了
                    const btnStillVisible = document.body.contains(expandBtn) && expandBtn.offsetParent !== null;

                    if (contentCount > 5 || !btnStillVisible || attempts >= maxAttempts) {
                        clearInterval(interval);
                        setTimeout(() => resolve(), 500); // 额外渲染时间
                    }
                }, 100);
            });
        }

        setStatus("正在提取评论数据...");

        // 1. 提取 DOM
        const comments: CommentItem[] = [];
        
        // 策略：以 .CommentContent 为锚点，因为这个类名在知乎非常稳定
        const contentElements = containerElement.querySelectorAll('.CommentContent');
        
        contentElements.forEach((contentEl, index) => {
            const text = contentEl.textContent || "";
            if (!text.trim()) return;

            // 向上查找评论项容器 (通常包含 data-id，或者是 li，或者只是父级结构)
            // 适配用户提供的结构：div[data-id] -> ... -> .CommentContent
            const itemContainer = contentEl.closest('[data-id]') || contentEl.closest('li') || contentEl.parentElement?.parentElement;
            
            let author = "匿名用户";
            let likes = 0;

            if (itemContainer) {
                // 提取作者：查找 href 包含 people 的链接，或者特定的 class
                // 优先找 .UserLink-link，其次找包含 /people/ 的链接，最后找注入过的链接
                const authorEl = itemContainer.querySelector('.UserLink-link') || 
                                 itemContainer.querySelector('a[href*="/people/"]') ||
                                 itemContainer.querySelector('.css-10u695f'); // 适配用户提供的 HTML
                
                if (authorEl) {
                    author = authorEl.textContent || "匿名用户";
                }

                // 提取点赞数
                // 查找包含心形图标的按钮，或者包含“赞”字的按钮
                const likeBtn = Array.from(itemContainer.querySelectorAll('button')).find(btn => 
                    btn.querySelector('.ZDI--HeartFill24') || // 赞同图标
                    btn.textContent?.includes('赞同') ||
                    btn.getAttribute('aria-label')?.includes('赞同')
                );

                if (likeBtn) {
                    // 提取数字，去除 "​" (零宽空格) 和其他非数字字符
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
            throw new Error(`评论太少 (${comments.length}条)，无法进行有效分析。请确保评论区已加载。`);
        }

        setStatus("AI 正在阅读大家的观点...");

        // 2. 调用 Service
        const response = await chrome.runtime.sendMessage({
            type: "ANALYZE_COMMENTS",
            comments,
            contextTitle
        });

        if (response.success) {
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
          <div style={{ padding: 16, background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: 300, border: '1px solid #eee' }}>
              <div style={{ color: 'red', marginBottom: 8 }}>分析失败</div>
              <div style={{ fontSize: 12 }}>{error}</div>
              <button onClick={onClose} style={{ marginTop: 8, padding: '4px 8px', cursor: 'pointer' }}>关闭</button>
          </div>
      )
  }

  if (loading) {
      return (
          <div style={{ padding: 16, background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: 300, border: '1px solid #eee' }}>
              <div>{status}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>请稍候...</div>
          </div>
      )
  }

  if (!result) return null;

  return (
    <div style={{ padding: 16, background: 'white', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 350, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📊 评论区舆情概览</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
      </div>
      
      <div style={{ background: '#f6f6f6', padding: 8, borderRadius: 4, fontSize: 13, marginBottom: 12, lineHeight: '1.5' }}>
          {result.summary}
      </div>

      <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>立场分布</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${result.stance_ratio.support * 100}%`, background: '#52c41a' }} title={`支持 ${Math.round(result.stance_ratio.support * 100)}%`} />
              <div style={{ width: `${result.stance_ratio.neutral * 100}%`, background: '#faad14' }} title={`中立 ${Math.round(result.stance_ratio.neutral * 100)}%`} />
              <div style={{ width: `${result.stance_ratio.oppose * 100}%`, background: '#ff4d4f' }} title={`反对 ${Math.round(result.stance_ratio.oppose * 100)}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, color: '#999' }}>
              <span>🟢 支持 {Math.round(result.stance_ratio.support * 100)}%</span>
              <span>🟡 中立 {Math.round(result.stance_ratio.neutral * 100)}%</span>
              <span>🔴 反对 {Math.round(result.stance_ratio.oppose * 100)}%</span>
          </div>
      </div>

      <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>核心观点</div>
          {result.key_points.map((point, i) => (
              <div key={i} style={{ marginBottom: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {point.type === 'support' ? '🟢' : point.type === 'oppose' ? '🔴' : '⚪'} {point.point}
                  </div>
                  {point.example_quotes.map((quote, j) => (
                      <div key={j} style={{ fontSize: 12, color: '#8590a6', paddingLeft: 10, borderLeft: '3px solid #eee', marginTop: 4, fontStyle: 'italic' }}>
                          "{quote}"
                      </div>
                  ))}
              </div>
          ))}
      </div>
    </div>
  );
};

// 注入逻辑
const ZhihuComments = () => {
    useEffect(() => {
        const injectButton = () => {
            // 使用用户提供的线索：Comments-container
            const containers = document.querySelectorAll('.Comments-container');
            
            containers.forEach(container => {
                // 1. 寻找 Header
                // 策略：寻找包含 "条评论" 文本的元素，或者包含 "默认" "最新" 排序按钮的容器
                let header: HTMLElement | null = null;
                let sortContainer: HTMLElement | null = null;

                // 遍历子元素寻找特征
                const children = Array.from(container.children) as HTMLElement[];
                for (const child of children) {
                    // 检查是否包含排序按钮 (特征：包含 "默认" 和 "最新")
                    if (child.innerText.includes('默认') && child.innerText.includes('最新')) {
                        // 递归向下找 flex 容器
                        const findFlexRow = (el: HTMLElement): HTMLElement | null => {
                            if (getComputedStyle(el).display === 'flex' && el.innerText.includes('条评论')) {
                                return el;
                            }
                            for (const c of Array.from(el.children) as HTMLElement[]) {
                                const found = findFlexRow(c);
                                if (found) return found;
                            }
                            return null;
                        };
                        
                        const flexRow = findFlexRow(child) || child; 
                        header = flexRow;
                        
                        // 尝试在 header 中找到排序按钮容器
                        const sortBtns = Array.from(header.querySelectorAll('div')).find(d => d.innerText.includes('默认') && d.innerText.includes('最新'));
                        if (sortBtns) sortContainer = sortBtns as HTMLElement;
                        
                        break;
                    }
                }

                // 如果没找到基于内容的 header，尝试基于类名的 fallback
                if (!header) {
                    header = container.querySelector('.CommentListV2-header') || 
                             container.querySelector('.Comments-header');
                }

                if (!header) return;

                if (header.querySelector('.deep-profile-summary-btn')) return;

                const btn = document.createElement('button');
                btn.className = 'Button deep-profile-summary-btn';
                btn.innerText = '📊 总结评论区观点';
                // 样式微调
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
                    
                    // 获取当前上下文标题
                    let title = "";
                    const questionHeader = document.querySelector('.QuestionHeader-title');
                    if (questionHeader) title = questionHeader.textContent || "";
                    
                    // 创建挂载点
                    const popupContainer = document.createElement('div');
                    popupContainer.style.position = 'absolute';
                    popupContainer.style.zIndex = '9999';
                    popupContainer.style.right = '20px';
                    popupContainer.style.top = '40px';
                    
                    // 确保父元素是相对定位
                    if (getComputedStyle(header).position === 'static') {
                        (header as HTMLElement).style.position = 'relative';
                    }
                    
                    header.appendChild(popupContainer);
                    
                    const root = createRoot(popupContainer);
                    root.render(<CommentAnalysisPanel 
                        onClose={() => {
                            root.unmount();
                            popupContainer.remove();
                        }} 
                        contextTitle={title} 
                        containerElement={container} 
                    />);
                };

                // 插入逻辑：放在排序按钮之前
                if (sortContainer) {
                    header.insertBefore(btn, sortContainer);
                } else {
                    // 如果没找到排序按钮，但找到了 header，就 append
                    header.appendChild(btn);
                }
            });
        };

        const observer = new MutationObserver(injectButton);
        observer.observe(document.body, { childList: true, subtree: true });
        
        // 立即执行一次
        injectButton();
        
        return () => observer.disconnect();
    }, []);

    return null;
}

export default ZhihuComments

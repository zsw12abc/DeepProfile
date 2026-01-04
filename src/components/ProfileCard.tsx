import React, { useState } from "react"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"
import { calculateFinalLabel, getLabelInfo, parseLabelName, filterLabelsByTopic } from "~services/LabelUtils"
import { TopicService, type MacroCategory } from "~services/TopicService"

interface ProfileData {
  nickname?: string
  topic_classification?: string
  political_leaning?: Array<{ label: string; score: number }> | string[]
  value_orientation?: Array<{ dimension: string; label: string; score: number }>
  summary?: string
  evidence?: Array<{
    quote: string
    analysis: string
    source_title: string
    source_id?: string
  }>
}

interface DebugInfo {
  totalDurationMs: number;
  llmDurationMs: number;
  itemsCount: number;
  itemsBreakdown?: string;
  sourceInfo?: string;
  model: string;
  context?: string;
  fetchStrategy?: string;
  tokens?: {
    prompt_tokens: number;
    completion_tokens: number,
    total_tokens: number;
  };
}

interface ProfileCardProps {
  userId: string
  initialNickname?: string
  profileData: {
    profile: {  // 现在 profile 是 LLMResponse 对象
      content: any,  // 解析后的画像数据
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      durationMs: number;
      model: string;
    },
    items: ZhihuContent[]
    userProfile: UserProfile | null
    debugInfo?: DebugInfo
    fromCache?: boolean
    cachedAt?: number
    cachedContext?: string
  } | null
  loading: boolean
  statusMessage?: string
  error?: string
  onClose: () => void
  onRefresh?: () => void // New prop for force refresh
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  userId,
  initialNickname,
  profileData,
  loading,
  statusMessage,
  error,
  onClose,
  onRefresh
}) => {
  const [showDebug, setShowDebug] = useState(false)
  const [expandedEvidence, setExpandedEvidence] = useState(false)
  
  let nickname = initialNickname || "未知用户"
  let topicClassification = "未知话题"
  let politicalLeaning: Array<{ label: string; score: number }> = []
  let summary = ""
  let evidence: Array<{ quote: string; analysis: string; source_title: string; source_id?: string }> = []
  let debugInfo: DebugInfo | undefined
  let items: ZhihuContent[] = []
  let fromCache = false
  let cachedAt = 0
  let cachedContext = ""

  if (profileData) {
    try {
      // 现在 profileData.profile 已经是解析后的对象，无需再访问 .content
      const parsedProfile = profileData.profile;
      nickname = parsedProfile.nickname || nickname
      topicClassification = parsedProfile.topic_classification || topicClassification
      
      // 应用话题相关性过滤
      if (Array.isArray(parsedProfile.political_leaning)) {
        politicalLeaning = filterLabelsByTopic(parsedProfile.political_leaning, topicClassification);
      }
      
      summary = parsedProfile.summary || ""
      evidence = parsedProfile.evidence || []
      debugInfo = profileData.debugInfo
      items = profileData.items || []
      fromCache = profileData.fromCache || false
      cachedAt = profileData.cachedAt || 0
      cachedContext = profileData.cachedContext || ""
    } catch (e) {
      console.error("Failed to parse profile data:", e)
    }
  }

  const displayName = nickname || `用户${userId.substring(0, 8)}`
  const userHomeUrl = `https://www.zhihu.com/people/${userId}`

  const toggleDebug = () => setShowDebug(!showDebug)
  const toggleEvidence = () => setExpandedEvidence(!expandedEvidence)

  // 计算进度条
  const renderProgressBar = () => {
    if (!loading && !statusMessage) return null; // 如果不是loading状态且没有状态消息，不显示进度条
    
    // 判断是否已经收到LLM响应
    const hasLLMResponse = profileData !== null;
    
    // 如果已经收到LLM响应，则不显示进度条
    if (hasLLMResponse) return null;
    
    return (
      <div style={{ marginBottom: "16px", fontSize: "14px", color: "#666" }}>
        {statusMessage}
      </div>
    );
  }

  // Render cache status bar
  const renderCacheStatus = () => {
    if (!fromCache) return null;
    
    const date = new Date(cachedAt);
    const timeStr = date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Determine category name from cached context (which is now the macro category key in some cases, or we re-classify)
    // Actually, in handleAnalysis we stored the original context in 'context' field of HistoryRecord
    // So cachedContext is the original context string.
    const category = TopicService.classify(cachedContext);
    const categoryName = TopicService.getCategoryName(category);

    return (
      <div style={{
        backgroundColor: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: "8px",
        padding: "8px 12px",
        marginBottom: "16px",
        fontSize: "12px",
        color: "#0369a1",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <span style={{ fontWeight: "600" }}>📅 历史记录 ({timeStr})</span>
          <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.8 }}>
            分类: {categoryName}
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              backgroundColor: "white",
              border: "1px solid #0ea5e9",
              color: "#0ea5e9",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: "500"
            }}
            onMouseOver={e => {
                e.currentTarget.style.backgroundColor = "#0ea5e9";
                e.currentTarget.style.color = "white";
            }}
            onMouseOut={e => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "#0ea5e9";
            }}
          >
            🔄 重新分析
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "380px",
        maxHeight: "80vh",
        overflowY: "auto",
        backgroundColor: "white",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        borderRadius: "12px",
        padding: "20px",
        zIndex: 9999,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "14px",
        color: "#333"
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          borderBottom: "1px solid #eee",
          paddingBottom: "10px"
        }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1a1a1a" }}>
            {loading ? (
                <span>分析中: {displayName}</span>
            ) : (
                <a 
                  href={userHomeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: "#1a1a1a", textDecoration: "none" }}
                  onMouseOver={e => e.currentTarget.style.color = "#0084ff"}
                  onMouseOut={e => e.currentTarget.style.color = "#1a1a1a"}
                >
                  {displayName}
                </a>
            )}
          </h3>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            话题分类: <span style={{ fontWeight: "500", color: "#0084ff" }}>{topicClassification}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            color: "#999",
            padding: "0",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#333")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
        >
          ×
        </button>
      </div>

      {/* 进度条区域 - 放在最上面 */}
      {renderProgressBar()}

      {/* 缓存状态提示 */}
      {renderCacheStatus()}

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#ffebee", borderRadius: "6px", color: "#c62828" }}>
          错误: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: "16px", marginBottom: "12px", color: "#0084ff" }}>正在分析用户画像...</div>
          <div style={{ fontSize: "12px", color: "#666" }}>请稍候，这可能需要几秒钟</div>
        </div>
      ) : profileData ? (
        <div>
          {/* 倾向标签放在最上面 */}
          {politicalLeaning && politicalLeaning.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#333" }}>倾向标签</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {politicalLeaning.map((item, index) => {
                  if (typeof item === 'string') {
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          backgroundColor: "#f0f0f0",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#666"
                        }}
                      >
                        <span style={{ flex: "1", textAlign: "left" }}>{item}</span>
                      </div>
                    );
                  } else {
                    const { label: labelName, score } = item;
                    const { label, percentage } = calculateFinalLabel(labelName, score);
                    
                    // 计算颜色，越极端越深
                    const intensity = Math.min(100, percentage);
                    const color = score >= 0 
                      ? `hsl(210, 70%, ${70 - intensity * 0.3}%)` // 蓝色系偏向正分
                      : `hsl(0, 70%, ${70 - Math.abs(intensity) * 0.3}%)`; // 红色系偏向负分

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          backgroundColor: "#f8f8f8",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }}
                      >
                        <span style={{ 
                          flex: "0 0 auto", 
                          width: "120px", 
                          color: "#333",
                          backgroundColor: "#e8e8e8",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          textAlign: "center"
                        }}>
                          {label}
                        </span>
                        <div style={{
                          flex: "1",
                          height: "12px",
                          backgroundColor: "#e0e0e0",
                          borderRadius: "6px",
                          marginLeft: "10px",
                          overflow: "hidden"
                        }}>
                          <div 
                            style={{
                              height: "100%",
                              width: `${percentage}%`,
                              backgroundColor: color,
                              borderRadius: "6px"
                            }}
                          />
                        </div>
                        <span style={{ flex: "0 0 auto", width: "40px", textAlign: "right", color: "#666", fontSize: "11px" }}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {summary && (
            <div style={{ marginBottom: "16px", lineHeight: "1.5" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#333" }}>用户总结</h4>
              <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
                {summary}
              </div>
            </div>
          )}

          {evidence && evidence.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>分析依据</h4>
                <button
                  onClick={toggleEvidence}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0084ff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}
                >
                  {expandedEvidence ? "收起" : "展开"}
                </button>
              </div>
              
              {expandedEvidence && (
                <div style={{ fontSize: "12px" }}>
                  {evidence.map((item, index) => {
                    // 查找对应的项目以获取URL
                    const sourceItem = items.find(i => i.id === item.source_id);
                    const sourceUrl = sourceItem?.url;
                    const sourceTitle = sourceItem?.title || item.source_title;

                    return (
                      <div key={index} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: index < evidence.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <div style={{ fontStyle: "italic", color: "#555", marginBottom: "4px" }}>
                          "{item.quote}"
                        </div>
                        <div style={{ color: "#666", marginBottom: "4px" }}>
                          {item.analysis}
                        </div>
                        <div style={{ fontSize: "11px", color: "#888" }}>
                          {/* 显示来源链接 */}
                          来源: 
                          {sourceUrl ? (
                            <a 
                              href={sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: "#0084ff", 
                                textDecoration: "none",
                                marginLeft: "4px"
                              }}
                              onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                            >
                              {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                            </a>
                          ) : (
                            // 如果找不到匹配的URL，尝试根据source_id构建知乎链接
                            (() => {
                              // 检查是否有source_id
                              if (item.source_id) {
                                // 首先尝试在items中查找，通过ID匹配
                                const itemWithId = items.find(i => i.id === item.source_id);
                                if (itemWithId) {
                                  // 如果找到了匹配的项目，尝试构建完整链接
                                  if (itemWithId.question_id && itemWithId.id) {
                                    // 构建标准的知乎回答链接格式
                                    const constructedUrl = `https://www.zhihu.com/question/${itemWithId.question_id}/answer/${itemWithId.id}`;
                                    return (
                                      <a 
                                        href={constructedUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                          color: "#0084ff", 
                                          textDecoration: "none",
                                          marginLeft: "4px"
                                        }}
                                        onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                        onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                      >
                                        {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                      </a>
                                    );
                                  } else if (itemWithId.url) {
                                    // 如果项目有直接的URL，使用它
                                    return (
                                      <a 
                                        href={itemWithId.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                          color: "#0084ff", 
                                          textDecoration: "none",
                                          marginLeft: "4px"
                                        }}
                                        onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                        onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                      >
                                        {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                      </a>
                                    );
                                  }
                                }
                                
                                // 如果在items中找不到，尝试根据ID类型构建链接
                                if (/^\d+$/.test(item.source_id)) {
                                  // 如果是纯数字ID，尝试构建可能的知乎链接
                                  // 但由于我们没有问题ID，只能构建基于答案ID的链接
                                  // 但知乎通常需要问题ID和答案ID
                                  // 这里我们尝试使用答案ID作为路径的一部分
                                  const constructedUrl = `https://www.zhihu.com/question/unknown/answer/${item.source_id}`;
                                  return (
                                    <a 
                                      href={constructedUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ 
                                        color: "#0084ff", 
                                        textDecoration: "none",
                                        marginLeft: "4px"
                                      }}
                                      onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                      onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                    >
                                      {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                    </a>
                                  );
                                } else {
                                  // 如果不是纯数字，尝试使用source_id作为可能的URL路径
                                  let constructedUrl = item.source_id;
                                  if (!item.source_id.startsWith('http')) {
                                    // 如果不是完整URL，尝试构建
                                    if (item.source_id.startsWith('/')) {
                                      constructedUrl = `https://www.zhihu.com${item.source_id}`;
                                    } else {
                                      constructedUrl = `https://www.zhihu.com/question/${item.source_id}`;
                                    }
                                  }
                                  return (
                                    <a 
                                      href={constructedUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ 
                                        color: "#0084ff", 
                                        textDecoration: "none",
                                        marginLeft: "4px"
                                      }}
                                      onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                      onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                    >
                                      {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                    </a>
                                  );
                                }
                              } else {
                                // 如果没有source_id，尝试通过标题匹配
                                const itemWithMatchingTitle = items.find(i => 
                                  i.title && sourceTitle && 
                                  (i.title.includes(sourceTitle) || sourceTitle.includes(i.title))
                                );
                                if (itemWithMatchingTitle?.url) {
                                  return (
                                    <a 
                                      href={itemWithMatchingTitle.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ 
                                        color: "#0084ff", 
                                        textDecoration: "none",
                                        marginLeft: "4px"
                                      }}
                                      onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                      onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                    >
                                      {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                    </a>
                                  );
                                } else {
                                  return (
                                    <span style={{ marginLeft: "4px" }}>
                                      {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                                    </span>
                                  );
                                }
                              }
                            })()
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {debugInfo && (
            <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#333" }}>调试信息</h4>
                <button
                  onClick={toggleDebug}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0084ff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}
                >
                  {showDebug ? "隐藏" : "显示"}
                </button>
              </div>
              
              {showDebug && (
                <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.4" }}>
                  <div>模型: {debugInfo.model}</div>
                  <div>总耗时: {(debugInfo.totalDurationMs / 1000).toFixed(1)}s</div>
                  <div>LLM耗时: {(debugInfo.llmDurationMs / 1000).toFixed(1)}s</div>
                  <div>数据项数: {debugInfo.itemsCount}</div>
                  <div>数据构成: {debugInfo.itemsBreakdown}</div>
                  <div>来源信息: {debugInfo.sourceInfo}</div>
                  {debugInfo.tokens && (
                    <div>
                      Token使用: {debugInfo.tokens.prompt_tokens}+{debugInfo.tokens.completion_tokens}={debugInfo.tokens.total_tokens}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// 修改导出方式，使其可以被命名导入
export { ProfileCard };
export default ProfileCard;
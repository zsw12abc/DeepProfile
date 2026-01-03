import React, { useState } from "react"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

interface ProfileData {
  nickname?: string
  political_leaning?: Array<{ label: string; score: number }> | string[]
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
  model: string;
  tokens?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ProfileCardProps {
  userId: string
  initialNickname?: string
  profileData: {
    profile: string
    items: ZhihuContent[]
    userProfile: UserProfile | null
    debugInfo?: DebugInfo
  } | null
  loading: boolean
  statusMessage?: string
  error?: string
  onClose: () => void
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userId,
  initialNickname,
  profileData,
  loading,
  statusMessage,
  error,
  onClose
}) => {
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false)

  let data: ProfileData | null = null
  
  if (profileData?.profile) {
    try {
      data = JSON.parse(profileData.profile)
    } catch (e) {
      data = { summary: profileData.profile }
    }
  }

  // Helper to find URL by ID
  const getSourceUrl = (sourceId?: string) => {
    if (!sourceId || !profileData?.items) return null
    const item = profileData.items.find(i => String(i.id) === String(sourceId))
    
    if (item) {
        if (item.type === 'answer') {
            if (item.question_id) {
                return `https://www.zhihu.com/question/${item.question_id}/answer/${item.id}`;
            }
            return `https://www.zhihu.com/answer/${item.id}`;
        } else if (item.type === 'article') {
            return `https://www.zhihu.com/p/${item.id}`;
        }
    }
    return null
  }

  const userHomeUrl = profileData?.userProfile?.url_token 
    ? `https://www.zhihu.com/people/${profileData.userProfile.url_token}`
    : `https://www.zhihu.com/people/${userId}`

  // Display name logic
  const displayName = data?.nickname || profileData?.userProfile?.name || initialNickname || userId

  // Helper to render leaning tags
  const renderLeaningTags = () => {
    if (!data?.political_leaning) return null;
    
    const tags = Array.isArray(data.political_leaning) ? data.political_leaning : [];
    
    if (tags.length === 0) return null;

    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8590a6", marginBottom: "6px" }}>
          倾向标签
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tags.map((tag: any, i: number) => {
            const label = typeof tag === 'string' ? tag : tag.label;
            const score = typeof tag === 'string' ? null : tag.score;
            
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
                <span
                  style={{
                    backgroundColor: "#e3f2fd",
                    color: "#0084ff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontWeight: "500",
                    marginRight: "8px",
                    minWidth: "60px",
                    textAlign: "center"
                  }}>
                  {label}
                </span>
                {score !== null && (
                  <div style={{ flex: 1, height: "6px", backgroundColor: "#eee", borderRadius: "3px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        width: `${score * 100}%`, 
                        height: "100%", 
                        backgroundColor: score > 0.7 ? "#0084ff" : "#90caf9",
                        borderRadius: "3px"
                      }} 
                    />
                  </div>
                )}
                {score !== null && (
                  <span style={{ marginLeft: "8px", color: "#999", fontSize: "11px", width: "30px", textAlign: "right" }}>
                    {Math.round(score * 100)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
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
          <span style={{ fontSize: "12px", color: "#8590a6" }}>
            {profileData?.userProfile?.headline || "用户画像分析"}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "20px",
            color: "#999",
            padding: "0 5px"
          }}>
          ✕
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#0084ff" }}>
          <div style={{ marginBottom: "10px", fontSize: "24px" }} className="spin">⏳</div>
          <div style={{ fontWeight: "500" }}>{statusMessage || "正在分析..."}</div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>请稍候，AI 正在阅读内容</div>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .spin { display: inline-block; animation: spin 2s linear infinite; }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ color: "#f44336", backgroundColor: "#ffebee", padding: "10px", borderRadius: "4px" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {/* 政治倾向标签 (带概率) */}
          {renderLeaningTags()}

          {/* 总结 */}
          {data.summary && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8590a6", marginBottom: "6px" }}>
                画像总结
              </div>
              <div style={{ lineHeight: "1.6", color: "#444", textAlign: "justify" }}>
                {data.summary}
              </div>
            </div>
          )}

          {/* 证据引用 - 折叠式 */}
          {data.evidence && data.evidence.length > 0 && (
            <div>
              <div 
                onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                style={{ 
                  fontSize: "12px", 
                  fontWeight: "bold", 
                  color: "#8590a6", 
                  marginBottom: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  userSelect: "none"
                }}>
                <span style={{ marginRight: "4px" }}>{isEvidenceExpanded ? "▼" : "▶"}</span>
                分析依据 ({data.evidence.length})
              </div>
              
              {isEvidenceExpanded && (
                <div style={{ 
                  maxHeight: "300px", 
                  overflowY: "auto", 
                  paddingRight: "4px",
                  marginTop: "8px"
                }}>
                  {data.evidence.map((item, i) => {
                    const url = getSourceUrl(item.source_id);
                    return (
                      <div key={i} style={{ marginBottom: "12px", backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "6px" }}>
                        <div style={{ fontStyle: "italic", color: "#666", marginBottom: "6px", fontSize: "13px", borderLeft: "3px solid #ddd", paddingLeft: "8px" }}>
                          "{item.quote}"
                        </div>
                        <div style={{ fontSize: "12px", marginBottom: "6px" }}>
                          {url ? (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: "#0084ff", textDecoration: "none" }}
                            >
                              📄 {item.source_title}
                            </a>
                          ) : (
                            <span style={{ color: "#999" }}>📄 {item.source_title}</span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#333" }}>
                          💡 {item.analysis}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Debug Info */}
          {profileData?.debugInfo && (
            <div style={{ 
              marginTop: "20px", 
              padding: "10px", 
              backgroundColor: "#f5f5f5", 
              borderRadius: "6px",
              fontSize: "11px",
              color: "#666",
              fontFamily: "monospace"
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>🛠️ Debug Info</div>
              <div>Model: {profileData.debugInfo.model}</div>
              <div>Total Time: {profileData.debugInfo.totalDurationMs}ms</div>
              <div>LLM Time: {profileData.debugInfo.llmDurationMs}ms</div>
              <div>Items Analyzed: {profileData.debugInfo.itemsCount}</div>
              {profileData.debugInfo.tokens && (
                <div>
                  Tokens: {profileData.debugInfo.tokens.total_tokens} 
                  (In: {profileData.debugInfo.tokens.prompt_tokens}, Out: {profileData.debugInfo.tokens.completion_tokens})
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState } from "react"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"

interface ProfileData {
  nickname?: string
  political_leaning?: string[]
  summary?: string
  evidence?: Array<{
    quote: string
    analysis: string
    source_title: string
    source_id?: string
  }>
}

interface ProfileCardProps {
  userId: string
  profileData: {
    profile: string
    items: ZhihuContent[]
    userProfile: UserProfile | null
  } | null
  loading: boolean
  error?: string
  onClose: () => void
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userId,
  profileData,
  loading,
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
            // Construct standard answer URL: https://www.zhihu.com/question/{qid}/answer/{aid}
            if (item.question_id) {
                return `https://www.zhihu.com/question/${item.question_id}/answer/${item.id}`;
            }
            // Fallback if question_id is missing (should redirect)
            return `https://www.zhihu.com/answer/${item.id}`;
        } else if (item.type === 'article') {
            // Construct standard article URL: https://www.zhihu.com/p/{id}
            return `https://www.zhihu.com/p/${item.id}`;
        }
    }
    return null
  }

  const userHomeUrl = profileData?.userProfile?.url_token 
    ? `https://www.zhihu.com/people/${profileData.userProfile.url_token}`
    : `https://www.zhihu.com/people/${userId}`

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
            <a 
              href={userHomeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#1a1a1a", textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.color = "#0084ff"}
              onMouseOut={e => e.currentTarget.style.color = "#1a1a1a"}
            >
              {data?.nickname || profileData?.userProfile?.name || userId}
            </a>
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
          <div style={{ marginBottom: "10px" }}>⏳</div>
          <div>正在深入分析用户动态...</div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>可能需要 5-10 秒</div>
        </div>
      )}

      {error && (
        <div style={{ color: "#f44336", backgroundColor: "#ffebee", padding: "10px", borderRadius: "4px" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {/* 政治倾向标签 */}
          {data.political_leaning && data.political_leaning.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8590a6", marginBottom: "6px" }}>
                倾向标签
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {data.political_leaning.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "#e3f2fd",
                      color: "#0084ff",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

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
        </div>
      )}
    </div>
  )
}

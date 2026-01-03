import React, { useState } from "react"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"
import { calculateFinalLabel, getLabelInfo, parseLabelName } from "~services/LabelUtils"

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

// 中英文标签映射
const labelMapping: { [key: string]: string } = {
  // 政治倾向
  "left-right": "左右倾向",
  "left": "左派",
  "right": "右派",
  "liberal-conservative": "自由保守",
  "liberal": "自由派",
  "conservative": "保守派",
  "radical-moderate": "激进温和",
  "radical": "激进派",
  "moderate": "温和派",
  "libertarian-authoritarian": "自由威权",
  "libertarian": "自由意志",
  "authoritarian": "威权主义",
  "capitalist-socialist": "资本主义-社会主义",
  "capitalist": "资本主义",
  "socialist": "社会主义",
  "nationalist-globalist": "民族主义-全球主义",
  "nationalist": "民族主义",
  "globalist": "全球主义",
  
  // 经济观点
  "market-intervention": "市场干预",
  "market": "市场主导",
  "intervention": "政府干预",
  "wealth-distribution": "财富分配",
  "wealth": "财富",
  "distribution": "分配",
  "free-competition": "自由竞争",
  "equal-distribution": "平等分配",
  
  // 社会观点
  "individual-collective": "个人集体",
  "individual": "个人主义",
  "collective": "集体主义",
  "traditional-progressive": "传统进步",
  "traditional": "传统派",
  "progressive": "进步派",
  
  // 科技观点
  "technology-view": "科技观点",
  "innovation-security": "创新安全",
  "innovation": "创新导向",
  "security": "安全导向",
  "open-proprietary": "开放封闭",
  "open": "开放",
  "proprietary": "封闭",
  
  // 文化观点
  "cultural-view": "文化观点",
  "local-global": "本土全球",
  "local": "本土化",
  // global is already defined above
  "material-spiritual": "物质精神",
  "material": "物质",
  "spiritual": "精神",
  
  // 环境观点
  "environment-view": "环境观点",
  "development-protection": "发展保护",
  "development": "发展",
  "protection": "保护"
};

// 将英文标签转换为中文
const getChineseLabel = (label: string): string => {
  if (!label) return label;
  const lowerLabel = label.toLowerCase().trim();
  
  // 尝试直接匹配
  if (labelMapping[lowerLabel]) return labelMapping[lowerLabel];
  
  // 尝试处理包含 vs 的情况
  if (lowerLabel.includes(' vs ')) {
    const parts = lowerLabel.split(' vs ');
    const left = labelMapping[parts[0]] || parts[0];
    const right = labelMapping[parts[1]] || parts[1];
    return `${left} vs ${right}`;
  }
  
  // 尝试处理包含 - 的情况 (如果是复合词，且在mapping中找不到整体)
  if (lowerLabel.includes('-')) {
    // 检查是否是已知的复合键
    if (labelMapping[lowerLabel]) return labelMapping[lowerLabel];
  }
  
  return label;
};

// Helper to render political leaning tags
const renderPoliticalLeaning = (data: ProfileData) => {
  if (!data?.political_leaning) return null;
  
  const tags = Array.isArray(data.political_leaning) ? data.political_leaning : [];
  
  if (tags.length === 0) return null;

  // Filter tags with absolute score >= 0.3 (significant scores)
  const significantTags = tags.filter(tag => 
    typeof tag === 'object' && tag.score !== undefined && Math.abs(tag.score) >= 0.3
  ) as Array<{ label: string; score: number }>;
  
  if (significantTags.length === 0) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8590a6", marginBottom: "6px" }}>
        倾向标签
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {significantTags.map((tag, i) => {
          const { label, score } = tag;
          const finalLabel = calculateFinalLabel(label, score);
          // 转换为中文标签
          const chineseLabel = getChineseLabel(finalLabel.label);
          
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
                  minWidth: "100px",
                  textAlign: "center"
                }}>
                {chineseLabel}
              </span>
              <div style={{ flex: 1, height: "6px", backgroundColor: "#eee", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: `${finalLabel.percentage}%`, 
                    height: "100%", 
                    backgroundColor: finalLabel.percentage > 70 ? "#0084ff" : "#90caf9",
                    borderRadius: "3px"
                  }} 
                />
              </div>
              <span style={{ marginLeft: "8px", color: "#999", fontSize: "11px", width: "60px", textAlign: "right" }}>
                {finalLabel.percentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  );
};

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
      const cleanedProfile = profileData.profile.replace(/^```json\s*|```\s*$/g, '').trim();
      data = JSON.parse(cleanedProfile)
    } catch (e) {
      console.error("Failed to parse profile JSON:", e, "Raw profile:", profileData.profile);
      data = { summary: profileData.profile }
    }
  }

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

  const displayName = data?.nickname || profileData?.userProfile?.name || initialNickname || userId

  const renderValueOrientation = () => {
    if (!data?.value_orientation) return null;
    
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8590a6", marginBottom: "6px" }}>
          价值取向
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.value_orientation.map((item, i) => {
            // 正确处理 value_orientation 格式，显示 label 而不是 dimension
            const displayLabel = item.label; // 直接使用 label 字段
            const displayScore = item.score;

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
                    minWidth: "100px",
                    textAlign: "center"
                  }}>
                  {getChineseLabel(displayLabel)}
                </span>
                <div style={{ flex: 1, height: "6px", backgroundColor: "#eee", borderRadius: "3px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      width: `${Math.abs(displayScore) * 100}%`, 
                      height: "100%", 
                      backgroundColor: Math.abs(displayScore) > 0.7 ? "#0084ff" : "#90caf9",
                      borderRadius: "3px"
                    }} 
                  />
                </div>
                <span style={{ marginLeft: "8px", color: "#999", fontSize: "11px", width: "40px", textAlign: "right" }}>
                  {Math.round(Math.abs(displayScore) * 100)}%
                </span>
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
          <div style={{ fontWeight: "500" }}>{statusMessage || "正在分析..."} </div>
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
          {/* 政治倾向标签 (带概率) - 优先显示 */}
          {renderPoliticalLeaning(data)}
          
          {/* 价值取向 (备用) - 如果没有政治倾向标签则显示 */}
          {!data.political_leaning && renderValueOrientation()}

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
              <div>Topic Class: {data.topic_classification || "N/A"}</div>
              <div>Context: {profileData.debugInfo.context || "None"}</div>
              <div>Strategy: {profileData.debugInfo.fetchStrategy}</div>
              <div>Source: {profileData.debugInfo.sourceInfo}</div>
              <div>Model: {profileData.debugInfo.model}</div>
              <div>Total Time: {profileData.debugInfo.totalDurationMs}ms</div>
              <div>LLM Time: {profileData.debugInfo.llmDurationMs}ms</div>
              <div>Breakdown: {profileData.debugInfo.itemsBreakdown}</div>
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
import React, { useState, useRef, useEffect } from "react"
import type { ZhihuContent, UserProfile } from "~services/ZhihuClient"
import { ZhihuClient } from "~services/ZhihuClient"
import { calculateFinalLabel } from "~services/LabelUtils"
import { TopicService, type MacroCategory } from "~services/TopicService"
import { ExportService } from "~services/ExportService"
import { ThemeService } from "~services/ThemeService"
import html2canvas from "html2canvas"
import icon from "data-base64:../../assets/icon.png"
import { I18nService } from "~services/I18nService"
import { 
  type ThemeConfig, 
  type UserHistoryRecord, 
  type ProfileData,
  type SupportedPlatform,
  ZHIHU_WHITE_THEME
} from "../types";

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
  record: UserHistoryRecord
  platform: SupportedPlatform
  onRefresh?: () => void
  onDelete?: () => void
  onExport?: () => void
}

const ProfileCard: React.FC<ProfileCardProps> = ({ record, platform, onRefresh, onDelete, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [theme, setTheme] = useState<ThemeConfig>(ZHIHU_WHITE_THEME);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const loadTheme = async () => {
      const themeService = ThemeService.getInstance();
      await themeService.initialize();
      setTheme(themeService.getCurrentTheme());
    };
    
    loadTheme();
  }, []);

  let nickname = record.nickname || I18nService.t('unknown_user')
  let topicClassification = I18nService.t('unknown_topic')
  let valueOrientation: Array<{ label: string; score: number }> = []
  let summary = ""
  let evidence: Array<{ quote: string; analysis: string; source_title: string; source_id?: string }> = []
  let debugInfo: DebugInfo | undefined
  let items: ZhihuContent[] = []
  let fromCache = false
  let cachedAt = 0
  let cachedContext = ""
  let userProfile: UserProfile | null = null

  if (record.profileData) {
    try {
      const parsedProfile: ProfileData = record.profileData;
      nickname = parsedProfile.nickname || nickname
      topicClassification = parsedProfile.topic_classification || topicClassification
      
      if (Array.isArray(parsedProfile.value_orientation)) {
        valueOrientation = parsedProfile.value_orientation;
      }
      
      summary = parsedProfile.summary || ""
      evidence = parsedProfile.evidence || []
      debugInfo = record.debugInfo
      items = record.items || []
      fromCache = record.fromCache || false
      cachedAt = record.cachedAt || 0
      cachedContext = record.cachedContext || ""
      userProfile = record.userProfile
    } catch (e) {
      console.error("Failed to parse profile data:", e)
    }
  }

  const displayName = nickname || `${I18nService.t('unknown_user')}${record.userId.substring(0, 8)}`
  const userHomeUrl = `https://www.zhihu.com/people/${record.userId}`

  const toggleDebug = () => setShowDebug(!showDebug)
  const toggleEvidence = () => setExpandedEvidence(!expandedEvidence)

  // 导出 Markdown
  const handleExportMarkdown = () => {
    if (!record.profileData) return;
    
    const category = TopicService.classify(cachedContext || "");
    const md = ExportService.toMarkdown(record.profileData as ProfileData, category, userHomeUrl, cachedAt || Date.now());
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeepProfile_${displayName}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导出图片
  const handleExportImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    
    try {
      // 临时展开所有内容以确保截图完整
      const wasEvidenceExpanded = expandedEvidence;
      const wasDebugShown = showDebug;
      setExpandedEvidence(true);
      setShowDebug(false); // 截图通常不需要调试信息
      
      // 创建一个临时的、样式化的容器用于截图
      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'absolute';
      exportContainer.style.top = '-9999px';
      exportContainer.style.left = '-9999px';
      exportContainer.style.width = '400px'; // 固定宽度，类似身份证
      exportContainer.style.backgroundColor = theme.colors.background; // 使用主题背景色
      exportContainer.style.padding = '20px';
      exportContainer.style.fontFamily = theme.typography.fontFamily; // 使用主题字体
      document.body.appendChild(exportContainer);

      // 构建 ID 卡片样式的内容
      const dateStr = new Date().toLocaleDateString(I18nService.getLanguage() === 'en-US' ? 'en-US' : 'zh-CN');
      
      // 渲染价值取向条
      let valueOrientationHtml = '';
      if (valueOrientation && valueOrientation.length > 0) {
          valueOrientationHtml = valueOrientation.map(item => {
              const { label: labelName, score } = item;
              const { label, percentage } = calculateFinalLabel(labelName, score);
              const intensity = Math.min(100, percentage);
              const color = score >= 0 
                ? `hsl(210, 70%, ${70 - intensity * 0.3}%)`
                : `hsl(0, 70%, ${70 - Math.abs(intensity) * 0.3}%)`;
              
              return `
                <div style="display: flex; align-items: center; margin-bottom: 8px; font-size: 12px;">
                    <span style="width: 100px; font-weight: 500; color: ${theme.colors.text};">${label}</span>
                    <div style="flex: 1; height: 8px; background-color: ${theme.colors.border}; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background-color: ${color}; border-radius: 4px;"></div>
                    </div>
                    <span style="width: 30px; text-align: right; font-size: 11px; color: ${theme.colors.textSecondary};">${Math.round(percentage)}%</span>
                </div>
              `;
          }).join('');
      }

      // 获取 Base64 编码的头像
      let avatarSrc = icon;
      if (userProfile?.avatar_url) {
        const base64Avatar = await ZhihuClient.fetchImageAsBase64(userProfile.avatar_url);
        if (base64Avatar) {
          avatarSrc = base64Avatar;
        }
      }
      
      // 二维码链接
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent("https://chrome.google.com/webstore/detail/deepprofile")}`;

      exportContainer.innerHTML = `
        <div style="background-color: ${theme.colors.surface}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%); padding: 24px 20px; color: white; position: relative;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 60px; height: 60px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); overflow: hidden;">
                        <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; font-family: ${theme.typography.fontFamily};">${displayName}</h2>
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px; font-family: ${theme.typography.fontFamily};">DeepProfile ${I18nService.t('app_description')}</div>
                    </div>
                </div>
                <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                    <div style="font-size: 10px; opacity: 0.8; font-family: ${theme.typography.fontFamily};">${I18nService.t('date_label')}</div>
                    <div style="font-size: 14px; font-weight: 600; font-family: ${theme.typography.fontFamily};">${dateStr}</div>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: ${theme.colors.textSecondary}; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${theme.typography.fontFamily};">${I18nService.t('topic_classification')}</div>
                    <div style="font-size: 16px; font-weight: 600; color: ${theme.colors.text}; background-color: ${theme.colors.background}; display: inline-block; padding: 4px 12px; border-radius: 20px; font-family: ${theme.typography.fontFamily};">${topicClassification}</div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: ${theme.colors.textSecondary}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${theme.typography.fontFamily};">${I18nService.t('ai_summary')}</div>
                    <div style="font-size: 14px; line-height: 1.6; color: ${theme.colors.text}; background-color: ${theme.colors.background}; padding: 12px; border-radius: 8px; border-left: 3px solid ${theme.colors.primary}; font-family: ${theme.typography.fontFamily};">
                        ${summary}
                    </div>
                </div>

                ${valueOrientationHtml ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: ${theme.colors.textSecondary}; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${theme.typography.fontFamily};">${I18nService.t('value_orientation')}</div>
                    ${valueOrientationHtml}
                </div>
                ` : ''}
                
                <div style="border-top: 1px dashed ${theme.colors.border}; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${qrCodeUrl}" style="width: 48px; height: 48px; border-radius: 4px;" crossOrigin="anonymous" />
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: ${theme.colors.text}; font-family: ${theme.typography.fontFamily};">DeepProfile</div>
                            <div style="font-size: 10px; color: ${theme.colors.textSecondary}; font-family: ${theme.typography.fontFamily};">${I18nService.t('ai_profile_analysis')}</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: ${theme.colors.textSecondary}; text-align: right; font-family: ${theme.typography.fontFamily};">
                        Scan to install<br/>Start your AI journey
                    </div>
                </div>
            </div>
        </div>
      `;

      // 等待图片加载
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        logging: false
      });
      
      const image = canvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = image;
      a.download = `DeepProfile_Card_${displayName}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      document.body.removeChild(exportContainer);
      
      // 恢复状态
      setExpandedEvidence(wasEvidenceExpanded);
      setShowDebug(wasDebugShown);
    } catch (e) {
      console.error("Export image failed:", e);
      alert(I18nService.t('export_image_failed'));
    } finally {
      setIsExporting(false);
    }
  };

  // 计算进度条
  const renderProgressBar = () => {
    if (!isLoading && !statusMessage) return null;
    
    const hasLLMResponse = record.profileData !== null;
    
    if (hasLLMResponse) return null;
    
    return (
      <div style={{ 
        marginBottom: theme.spacing.md, 
        fontSize: theme.typography.fontSizeBase, 
        color: theme.colors.textSecondary 
      }}>
        {statusMessage}
      </div>
    );
  }

  // Render cache status bar
  const renderCacheStatus = () => {
    if (!fromCache) return null;
    
    const date = new Date(cachedAt);
    const timeStr = date.toLocaleString(I18nService.getLanguage() === 'en-US' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const category = TopicService.classify(cachedContext);
    const categoryName = TopicService.getCategoryName(category);

    return (
      <div style={{
        backgroundColor: theme.colors.primary + "20", // 20% opacity
        border: `1px solid ${theme.colors.primary}40`, // 40% opacity
        borderRadius: theme.borderRadius.medium,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        fontSize: theme.typography.fontSizeSmall,
        color: theme.colors.primary,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <span style={{ fontWeight: theme.typography.fontWeightBold }}>{I18nService.t('history_record')} ({timeStr})</span>
          <div style={{ fontSize: theme.typography.fontSizeSmall, marginTop: theme.spacing.xs, opacity: 0.8 }}>
            {I18nService.t('topic_classification')}: {categoryName}
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.primary}`,
              color: theme.colors.primary,
              borderRadius: theme.borderRadius.small,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              fontSize: theme.typography.fontSizeSmall,
              cursor: "pointer",
              fontWeight: theme.typography.fontWeightBold
            }}
            onMouseOver={e => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
                e.currentTarget.style.color = theme.colors.surface;
            }}
            onMouseOut={e => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.primary;
            }}
          >
            {I18nService.t('reanalyze')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        bottom: theme.spacing.lg,
        right: theme.spacing.lg,
        width: "380px",
        maxHeight: "80vh",
        overflowY: "auto",
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.large,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.lg,
        zIndex: 9999,
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSizeBase,
        color: theme.colors.text
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing.sm
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
          {userProfile?.avatar_url && (
            <img 
              src={userProfile.avatar_url} 
              alt="avatar" 
              style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} 
            />
          )}
          <div>
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSizeMedium, fontWeight: theme.typography.fontWeightBold, color: theme.colors.text }}>
              {isLoading ? (
                  <span>{I18nService.t('analyzing')}: {displayName}</span>
              ) : (
                  <a 
                    href={userHomeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: theme.colors.text, textDecoration: "none" }}
                    onMouseOver={e => e.currentTarget.style.color = theme.colors.primary}
                    onMouseOut={e => e.currentTarget.style.color = theme.colors.text}
                  >
                    {displayName}
                  </a>
              )}
            </h3>
            <div style={{ fontSize: theme.typography.fontSizeSmall, color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
              {I18nService.t('topic_classification')}: <span style={{ fontWeight: theme.typography.fontWeightBold, color: theme.colors.primary }}>{topicClassification}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: theme.spacing.sm }}>
          {record.profileData && !isLoading && (
            <>
              <button
                onClick={handleExportMarkdown}
                title={I18nService.t('export_markdown')}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.small,
                  transition: "background-color 0.2s",
                  color: theme.colors.textSecondary
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = theme.colors.textSecondary + "20"}
                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                📝
              </button>
              <button
                onClick={handleExportImage}
                title={I18nService.t('export_image')}
                disabled={isExporting}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  cursor: isExporting ? "wait" : "pointer",
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.small,
                  transition: "background-color 0.2s",
                  opacity: isExporting ? 0.5 : 1,
                  color: theme.colors.textSecondary
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = theme.colors.textSecondary + "20"}
                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                📸
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: theme.colors.textSecondary,
              padding: 0,
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = theme.colors.text)}
            onMouseOut={(e) => (e.currentTarget.style.color = theme.colors.textSecondary)}
          >
            ×
          </button>
        </div>
      </div>

      {renderProgressBar()}
      {renderCacheStatus()}

      {error && (
        <div style={{ 
          marginBottom: theme.spacing.md, 
          padding: theme.spacing.sm, 
          backgroundColor: theme.colors.error + "20", 
          borderRadius: theme.borderRadius.small, 
          color: theme.colors.error 
        }}>
          Error: {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: `${parseInt(theme.spacing.lg) * 1.25}px 0` }}>
          <div style={{ fontSize: theme.typography.fontSizeMedium, marginBottom: theme.spacing.sm, color: theme.colors.primary }}>{I18nService.t('analyzing')}...</div>
          <div style={{ fontSize: theme.typography.fontSizeSmall, color: theme.colors.textSecondary }}>{I18nService.t('wait_moment')}</div>
        </div>
      ) : record.profileData ? (
        <div>
          {valueOrientation && valueOrientation.length > 0 && (
            <div style={{ marginBottom: theme.spacing.md }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: theme.typography.fontSizeBase, fontWeight: theme.typography.fontWeightBold, color: theme.colors.text }}>{I18nService.t('value_orientation')}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
                {valueOrientation.map((item, index) => {
                  const { label: labelName, score } = item;
                  const { label, percentage } = calculateFinalLabel(labelName, score);
                  
                  const intensity = Math.min(100, percentage);
                  const color = score >= 0 
                    ? `hsl(210, 70%, ${70 - intensity * 0.3}%)`
                    : `hsl(0, 70%, ${70 - Math.abs(intensity) * 0.3}%)`;

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        backgroundColor: theme.colors.background,
                        borderRadius: theme.borderRadius.medium,
                        fontSize: theme.typography.fontSizeSmall
                      }}
                    >
                      <span style={{ 
                        flex: "0 0 auto", 
                        width: "120px", 
                        color: theme.colors.text,
                        backgroundColor: theme.colors.surface,
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.small,
                        fontSize: theme.typography.fontSizeSmall,
                        textAlign: "center"
                      }}>
                        {label}
                      </span>
                      <div style={{
                        flex: "1",
                        height: "12px",
                        backgroundColor: theme.colors.border,
                        borderRadius: theme.borderRadius.small,
                        marginLeft: theme.spacing.sm,
                        overflow: "hidden"
                      }}>
                        <div 
                          style={{
                            height: "100%",
                            width: `${percentage}%`,
                            backgroundColor: color,
                            borderRadius: theme.borderRadius.small
                          }}
                        />
                      </div>
                      <span style={{ flex: "0 0 auto", width: "40px", textAlign: "right", color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSmall }}>
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary && (
            <div style={{ marginBottom: theme.spacing.md, lineHeight: theme.typography.lineHeight.toString() }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: theme.typography.fontSizeBase, fontWeight: theme.typography.fontWeightBold, color: theme.colors.text }}>{I18nService.t('ai_summary')}</h4>
              <div style={{ fontSize: theme.typography.fontSizeSmall, color: theme.colors.text, lineHeight: theme.typography.lineHeight.toString() }}>
                {summary}
              </div>
            </div>
          )}

          {evidence && evidence.length > 0 && (
            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.sm }}>
                <h4 style={{ margin: "0", fontSize: theme.typography.fontSizeBase, fontWeight: theme.typography.fontWeightBold, color: theme.colors.text }}>{I18nService.t('evidence')}</h4>
                <button
                  onClick={toggleEvidence}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.colors.primary,
                    cursor: "pointer",
                    fontSize: theme.typography.fontSizeSmall,
                    fontWeight: theme.typography.fontWeightBold
                  }}
                >
                  {expandedEvidence ? I18nService.t('collapse') : I18nService.t('expand')}
                </button>
              </div>
              
              {expandedEvidence && (
                <div style={{ fontSize: theme.typography.fontSizeSmall }}>
                  {evidence.map((item, index) => {
                    let sourceItem = items.find(i => i.id === item.source_id);
                    // Fallback: try matching by title if ID match fails
                    if (!sourceItem && item.source_title) {
                        sourceItem = items.find(i => i.title && (i.title === item.source_title || i.title.includes(item.source_title) || item.source_title.includes(i.title)));
                    }

                    const sourceUrl = sourceItem?.url;
                    const sourceTitle = sourceItem?.title || item.source_title;

                    return (
                      <div key={index} style={{ marginBottom: theme.spacing.sm, paddingBottom: theme.spacing.sm, borderBottom: index < evidence.length - 1 ? `1px solid ${theme.colors.border}` : "none" }}>
                        <div style={{ fontStyle: "italic", color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>
                          "{item.quote}"
                        </div>
                        <div style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>
                          {item.analysis}
                        </div>
                        <div style={{ fontSize: theme.typography.fontSizeSmall, color: theme.colors.textSecondary }}>
                          {I18nService.t('source')}: 
                          {sourceUrl ? (
                            <a 
                              href={sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: theme.colors.primary, 
                                textDecoration: "none",
                                marginLeft: theme.spacing.xs
                              }}
                              onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                            >
                              {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                            </a>
                          ) : (
                            <span style={{ marginLeft: theme.spacing.xs }}>
                              {sourceTitle?.length > 30 ? sourceTitle.substring(0, 30) + "..." : sourceTitle}
                            </span>
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
            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.lg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.sm }}>
                <h4 style={{ margin: "0", fontSize: theme.typography.fontSizeBase, fontWeight: theme.typography.fontWeightBold, color: theme.colors.text }}>{I18nService.t('debug_info')}</h4>
                <button
                  onClick={toggleDebug}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.colors.primary,
                    cursor: "pointer",
                    fontSize: theme.typography.fontSizeSmall,
                    fontWeight: theme.typography.fontWeightBold
                  }}
                >
                  {showDebug ? I18nService.t('collapse') : I18nService.t('expand')}
                </button>
              </div>
              
              {showDebug && (
                <div style={{ fontSize: theme.typography.fontSizeSmall, color: theme.colors.textSecondary, lineHeight: theme.typography.lineHeight.toString() }}>
                  <div>{I18nService.t('token_usage')}: {debugInfo.model}</div>
                  <div>{I18nService.t('total_duration')}: {(debugInfo.totalDurationMs / 1000).toFixed(1)}s</div>
                  <div>{I18nService.t('llm_duration')}: {(debugInfo.llmDurationMs / 1000).toFixed(1)}s</div>
                  <div>{I18nService.t('data_items')}: {debugInfo.itemsCount}</div>
                  <div>{I18nService.t('data_breakdown')}: {debugInfo.itemsBreakdown}</div>
                  <div>{I18nService.t('source')}: {debugInfo.sourceInfo}</div>
                  {debugInfo.tokens && (
                    <div>
                      {I18nService.t('token_usage')}: {debugInfo.tokens.prompt_tokens}+{debugInfo.tokens.completion_tokens}={debugInfo.tokens.total_tokens}
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

export { ProfileCard };
export default ProfileCard;
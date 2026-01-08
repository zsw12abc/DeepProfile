import React from "react";
import { Card } from "./UIComponents";
import { HistoryService } from "~services/HistoryService";
import { ExportService } from "~services/ExportService";
import { calculateFinalLabel } from "~services/LabelUtils";
import { TopicService, type MacroCategory } from "~services/TopicService";
import { ZhihuClient } from "~services/ZhihuClient";
import { I18nService } from "~services/I18nService";
import { type UserHistoryRecord, type ProfileData, type SupportedPlatform } from "~types";
import icon from "data-base64:../assets/icon.png";
import html2canvas from "html2canvas";
import MarkdownRenderer from "~components/MarkdownRenderer";


interface HistorySectionProps {
  historyRecords: UserHistoryRecord[];
  loadingHistory: boolean;
  isExporting: boolean;
  handleDeleteProfile: (userId: string, platform: SupportedPlatform, category: string) => void;
  handleDeleteUser: (userId: string, platform: SupportedPlatform) => void;
  handleClearAllHistory: () => void;
  handleExportMarkdown: (profileData: ProfileData, category: MacroCategory, userId: string, timestamp: number) => void;
  handleExportImage: (profileData: ProfileData, category: MacroCategory, userId: string, timestamp: number, userInfo?: any) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  historyRecords,
  loadingHistory,
  isExporting,
  handleDeleteProfile,
  handleDeleteUser,
  handleClearAllHistory,
  handleExportMarkdown,
  handleExportImage
}) => {
  return (
    <Card title={I18nService.t('settings_history')} icon={<span style={{ fontSize: "24px" }}>📅</span>}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "14px", color: "var(--theme-text-secondary, #666)" }}>
          Total {historyRecords.length} users (Max {200})
        </div>
        {historyRecords.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--theme-error, #fee2e2)",
              color: "var(--theme-error, #c53030)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600"
            }}
          >
            {I18nService.t('clear_all')}
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-secondary, #a0aec0)" }}>
          {I18nService.t('loading')}
        </div>
      ) : historyRecords.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px", 
          backgroundColor: "var(--theme-surface, #f8fafc)", 
          borderRadius: "10px",
          color: "var(--theme-text-secondary, #a0aec0)",
          border: "1px dashed var(--theme-border, #e2e8f0)"
        }}>
          {I18nService.t('history_empty')}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {historyRecords.map((userRecord) => (
            <details key={`${userRecord.platform}-${userRecord.userId}`} style={{
              padding: "16px",
              backgroundColor: "var(--theme-surface, #fff)",
              border: "1px solid var(--theme-border, #e2e8f0)",
              borderRadius: "10px",
              transition: "all 0.2s",
              boxShadow: "var(--theme-shadow-small, 0 2px 4px rgba(0,0,0,0.02))"
            }}>
              <summary style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ 
                    fontSize: "12px", 
                    padding: "2px 6px", 
                    borderRadius: "4px", 
                    backgroundColor: userRecord.platform === 'zhihu' ? 'var(--theme-primary, #e1f0fa)' : 'var(--theme-warning, #ffedd5)',
                    color: userRecord.platform === 'zhihu' ? 'var(--theme-primary-text, #ffffff)' : 'var(--theme-warning-text, #ffffff)',
                    fontWeight: "600"
                  }}>
                    {userRecord.platform === 'zhihu' ? '知乎' : 'Reddit'}
                  </span>
                  <span style={{ fontWeight: "600", color: "var(--theme-text, #2d3748)" }}>
                    {userRecord.userInfo?.name || Object.values(userRecord.profiles)[0]?.profileData.nickname || userRecord.userId}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--theme-text-secondary, #a0aec0)" }}>({userRecord.userId})</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); handleDeleteUser(userRecord.userId, userRecord.platform); }}
                  style={{
                    padding: "8px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: "var(--theme-text-secondary, #cbd5e0)",
                    transition: "color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.color = "var(--theme-error, #e53e3e)"}
                  onMouseOut={e => e.currentTarget.style.color = "var(--theme-text-secondary, #cbd5e0)"}
                  title={I18nService.t('delete')}
                >
                  ×
                </button>
              </summary>
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--theme-border, #f0f0f0)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {Object.values(userRecord.profiles).map(profile => {
                  const date = new Date(profile.timestamp);
                  const timeStr = date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const categoryName = TopicService.getCategoryName(profile.category as MacroCategory);
                  const summary = profile.profileData.summary;
                  const labels = profile.profileData.value_orientation || profile.profileData.political_leaning || [];

                  return (
                    <details key={profile.category} style={{ fontSize: "13px", color: "var(--theme-text, #4a5568)", padding: "8px", borderRadius: "6px", backgroundColor: "var(--theme-surface, #f8fafc)" }}>
                      <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontWeight: "500" }}>{categoryName}</div>
                          <div style={{ fontSize: "11px", color: "var(--theme-text-secondary, #a0aec0)", marginTop: "2px" }}>🕒 {timeStr}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={(e) => { 
                              e.preventDefault(); 
                              handleExportMarkdown(profile.profileData as ProfileData, profile.category as MacroCategory, userRecord.userId, profile.timestamp); 
                            }}
                            style={{
                              padding: "4px",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "var(--theme-text-secondary, #cbd5e0)",
                              transition: "color 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.color = "var(--theme-primary, #3498db)"}
                            onMouseOut={e => e.currentTarget.style.color = "var(--theme-text-secondary, #cbd5e0)"}
                            title={I18nService.t('export_markdown')}
                          >
                            📝
                          </button>
                          <button
                            onClick={(e) => { 
                              e.preventDefault(); 
                              handleExportImage(profile.profileData as ProfileData, profile.category as MacroCategory, userRecord.userId, profile.timestamp, userRecord.userInfo); 
                            }}
                            style={{
                              padding: "4px",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: isExporting ? "wait" : "pointer",
                              fontSize: "14px",
                              color: "var(--theme-text-secondary, #cbd5e0)",
                              transition: "color 0.2s",
                              opacity: isExporting ? 0.5 : 1
                            }}
                            onMouseOver={e => e.currentTarget.style.color = "var(--theme-primary, #3498db)"}
                            onMouseOut={e => e.currentTarget.style.color = "var(--theme-text-secondary, #cbd5e0)"}
                            title={I18nService.t('export_image')}
                            disabled={isExporting}
                          >
                            📸
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeleteProfile(userRecord.userId, userRecord.platform, profile.category); }}
                            style={{
                              padding: "4px",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "var(--theme-text-secondary, #cbd5e0)",
                              transition: "color 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.color = "var(--theme-error, #e53e3e)"}
                            onMouseOut={e => e.currentTarget.style.color = "var(--theme-text-secondary, #cbd5e0)"}
                            title={I18nService.t('delete')}
                          >
                            🗑️
                          </button>
                        </div>
                      </summary>
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--theme-border, #e2e8f0)" }}>
                        <p style={{ margin: "0 0 10px 0", fontStyle: "italic" }}>"{summary}"</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {labels.map((item: { label: string; score: number }, index: number) => {
                            const { label, percentage } = calculateFinalLabel(item.label, item.score);
                            return (
                              <div key={index} style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
                                <span style={{ width: "80px", fontWeight: "500", color: "var(--theme-text, #4a5568)" }}>{label}</span>
                                <div style={{ flex: 1, height: "8px", backgroundColor: "var(--theme-border, #e0e0e0)", borderRadius: "4px", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${percentage}%`, backgroundColor: item.score > 0 ? "var(--theme-primary, #3498db)" : "var(--theme-error, #e74c3c)", borderRadius: "4px" }} />
                                </div>
                                <span style={{ width: "30px", textAlign: "right", fontSize: "11px", color: "var(--theme-text, #4a5568)" }}>{percentage}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
};
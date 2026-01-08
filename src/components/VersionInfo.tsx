import React from "react";
import { Card } from "./UIComponents";
import { I18nService } from "~services/I18nService";
import MarkdownRenderer from "~components/MarkdownRenderer";
import zhCNChangelog from "data-text:../locales/zh-CN/CHANGELOG.md";
import enUSChangelog from "data-text:../locales/en-US/CHANGELOG.md";

// 获取版本信息
export const getVersion = (): string => {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest.version;
  } catch (e) {
    return "0.6.1"; // Fallback
  }
};

// 获取CHANGELOG内容
export const fetchChangelogContent = async (lang: string): Promise<string> => {
  if (lang === 'zh-CN') {
    return zhCNChangelog;
  } else {
    return enUSChangelog;
  }
};

interface VersionInfoProps {
  changelog: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ changelog }) => {
  return (
    <Card title={I18nService.t('version_info')} icon={<span style={{ fontSize: "24px" }}>ℹ️</span>}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--theme-text, #2d3748)", marginBottom: "8px" }}>
          {I18nService.t('current_version')}: 
          <span style={{ color: "var(--theme-primary, #3498db)", marginLeft: "8px" }}>{`v${getVersion()}`}</span>
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "var(--theme-text, #2d3748)" }}>
          {I18nService.t('changelog')}
        </h4>
        <div style={{ 
          maxHeight: "400px", 
          overflowY: "auto", 
          padding: "16px", 
          backgroundColor: "var(--theme-surface, #f8fafc)", 
          borderRadius: "8px", 
          border: "1px solid var(--theme-border, #e2e8f0)",
          lineHeight: "1.6"
        }}>
          <MarkdownRenderer content={changelog} />
        </div>
      </div>
      
      <div>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "var(--theme-text, #2d3748)" }}>
          {I18nService.t('version_history')}
        </h4>
        <div style={{ 
          maxHeight: "300px", 
          overflowY: "auto", 
          padding: "16px", 
          backgroundColor: "var(--theme-surface, #f8fafc)", 
          borderRadius: "8px", 
          border: "1px solid var(--theme-border, #e2e8f0)",
          lineHeight: "1.6"
        }}>
          <MarkdownRenderer content={changelog} />
        </div>
      </div>
    </Card>
  );
};
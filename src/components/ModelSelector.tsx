import React from "react";
import { I18nService } from "../services/I18nService";

interface ModelSelectorProps {
  isLoadingModels: boolean;
  models: string[];
  modelError: string | null;
  config: any;
  setConfig: (config: any) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  isLoadingModels, 
  models, 
  modelError, 
  config, 
  setConfig 
}) => {
  if (isLoadingModels) {
    return <div style={{ 
      color: "var(--theme-text-secondary, #718096)", 
      fontSize: "14px", 
      padding: "14px", 
      backgroundColor: "var(--theme-surface, #f8fafc)", 
      borderRadius: "var(--theme-border-radius-medium, 10px)", 
      display: "flex", 
      alignItems: "center", 
      gap: "8px"
    }}>⏳ {I18nService.t('loading')}</div>
  }
  
  const hasModels = models.length > 0;
  
  return (
    <>
      {hasModels ? (
          <div style={{ position: "relative" }}>
              <select
              value={config.customModelNames?.[config.selectedProvider] || ""}
              onChange={(e) =>
                  setConfig({
                  ...config,
                  customModelNames: {
                      ...config.customModelNames,
                      [config.selectedProvider]: e.target.value
                  }
                  })
              }
              style={{ 
                  padding: "14px", 
                  width: "100%", 
                  borderRadius: "var(--theme-border-radius-medium, 10px)", 
                  border: "2px solid var(--theme-border, #e2e8f0)", 
                  backgroundColor: "var(--theme-surface, #fff)",
                  color: "var(--theme-text, #4a5568)",  // 添加文字颜色
                  fontSize: "15px",
                  appearance: "none",
                  backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22var(--theme-text, %234a5568)%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px top 50%",
                  backgroundSize: "12px auto"
              }}
              >
              <option value="" style={{ backgroundColor: "var(--theme-surface, #fff)", color: "var(--theme-text, #4a5568)" }}>-- {I18nService.t('model_select')} --</option>
              {models.map(m => <option key={m} value={m} style={{ backgroundColor: "var(--theme-surface, #fff)", color: "var(--theme-text, #4a5568)" }}>{m}</option>)}
              </select>
          </div>
      ) : (
          <input
            type="text"
            value={config.customModelNames?.[config.selectedProvider] || ""}
            onChange={(e) =>
              setConfig({
                ...config,
                customModelNames: {
                  ...config.customModelNames,
                  [config.selectedProvider]: e.target.value
                }
              })
            }
            style={{ 
              padding: "14px", 
              width: "100%", 
              borderRadius: "var(--theme-border-radius-medium, 10px)", 
              border: "2px solid var(--theme-border, #e2e8f0)", 
              fontSize: "15px",
              backgroundColor: "var(--theme-surface, #fff)",
              color: "var(--theme-text, #4a5568)"  // 添加文字颜色
            }}
            placeholder="手动输入模型名称 (如 gpt-4o)"
          />
      )}
      
      {modelError && (
          <div style={{ 
            color: "var(--theme-error-text, #742a2a)", 
            fontSize: "13px", 
            marginTop: "8px", 
            display: "flex", 
            alignItems: "center", 
            gap: "6px",
            backgroundColor: "var(--theme-error-bg, #ffeef0)",
            padding: "10px",
            borderRadius: "var(--theme-border-radius-small, 8px)",
            border: "1px solid var(--theme-error-border, #feb2b2)",
            wordBreak: "break-word"
          }}>
              ⚠️ {modelError}
          </div>
      )}
    </>
  )
};

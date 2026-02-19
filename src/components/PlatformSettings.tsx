import React from "react";
import { Card, InputGroup } from "./UIComponents";
import { DEFAULT_CONFIG, type AnalysisMode, type Language } from "~types";
import { I18nService } from "~services/I18nService";

// 常量定义
export const PROVIDERS: { value: any; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "阿里云北京服 (通义千问)" },
  { value: "qwen-intl", label: "阿里云新加坡服 (通义千问)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI Compatible)" },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

// 通用设置组件
interface GeneralSettingsProps {
  config: any;
  setConfig: (config: any) => void;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  handleTestConnection: () => void;
  renderModelSelector: () => React.ReactNode;
  handleSave?: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  config,
  setConfig,
  isTesting,
  testResult,
  handleTestConnection,
  renderModelSelector,
  handleSave = () => {},
}) => {
  const showBaseUrlInput =
    config.selectedProvider === "ollama" ||
    config.selectedProvider === "custom" ||
    config.selectedProvider === "qwen" ||
    config.selectedProvider === "qwen-intl" ||
    config.selectedProvider === "deepseek" ||
    config.selectedProvider === "openai";

  const getBaseUrlPlaceholder = (provider: any) => {
    switch (provider) {
      case "ollama":
        return "http://localhost:11434";
      case "qwen":
        return "https://dashscope.aliyuncs.com/compatible-mode/v1";
      case "qwen-intl":
        return "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
      case "deepseek":
        return "https://api.deepseek.com/v1";
      case "custom":
        return "https://api.example.com/v1";
      default:
        return "https://api.openai.com/v1";
    }
  };

  return (
    <Card
      title={I18nService.t("settings_general")}
      icon={<span style={{ fontSize: "24px" }}>🤖</span>}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          backgroundColor: config.globalEnabled
            ? "var(--theme-success-bg, #f0fff4)"
            : "var(--theme-error-bg, #fff5f5)",
          borderRadius: "var(--theme-border-radius-medium, 10px)",
          marginBottom: "24px",
          border: `1px solid ${
            config.globalEnabled
              ? "var(--theme-success-border, #c6f6d5)"
              : "var(--theme-error-border, #feb2b2)"
          }`,
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            htmlFor="globalEnabled"
            style={{
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "16px",
              color: config.globalEnabled
                ? "var(--theme-success-text, #22543d)"
                : "var(--theme-error-text, #742a2a)",
              display: "block",
            }}
          >
            {config.globalEnabled
              ? I18nService.t("plugin_enabled")
              : I18nService.t("plugin_disabled")}
          </label>
          <div
            style={{
              fontSize: "13px",
              color: config.globalEnabled
                ? "var(--theme-success-text, #2f855a)"
                : "var(--theme-error-text, #9b2c2c)",
              marginTop: "4px",
            }}
          >
            {config.globalEnabled
              ? I18nService.t("plugin_enabled_desc")
              : I18nService.t("plugin_disabled_desc")}
          </div>
        </div>
        <div style={{ position: "relative", width: "52px", height: "32px" }}>
          <input
            type="checkbox"
            id="globalEnabled"
            checked={config.globalEnabled}
            onChange={(e) =>
              setConfig({ ...config, globalEnabled: e.target.checked })
            }
            style={{
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          <label
            htmlFor="globalEnabled"
            style={{
              position: "absolute",
              cursor: "pointer",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: config.globalEnabled
                ? "var(--theme-success, #48bb78)"
                : "var(--theme-border, #ccc)",
              transition: ".4s",
              borderRadius: "34px",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: "24px",
                width: "24px",
                left: config.globalEnabled ? "24px" : "4px",
                bottom: "4px",
                backgroundColor: "var(--theme-surface, white)",
                transition: ".4s",
                borderRadius: "50%",
              }}
            ></span>
          </label>
        </div>
      </div>

      <InputGroup label="Language / 语言">
        <div style={{ position: "relative" }}>
          <select
            value={config.language}
            onChange={(e) => {
              const newLang = e.target.value as Language;
              setConfig({ ...config, language: newLang });
              I18nService.setLanguage(newLang);
            }}
            style={{
              padding: "14px",
              width: "100%",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              border: "2px solid var(--theme-border, #e2e8f0)",
              backgroundColor: "var(--theme-surface, #fff)",
              color: "var(--theme-text, #4a5568)",
              fontSize: "15px",
              appearance: "none",
              backgroundImage:
                'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22var(--theme-text, %234a5568)%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px top 50%",
              backgroundSize: "12px auto",
            }}
          >
            {LANGUAGES.map((l) => (
              <option
                key={l.value}
                value={l.value}
                style={{
                  backgroundColor: "var(--theme-surface, #fff)",
                  color: "var(--theme-text, #4a5568)",
                }}
              >
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </InputGroup>

      <InputGroup label={I18nService.t("ai_provider")}>
        <div style={{ position: "relative" }}>
          <select
            value={config.selectedProvider}
            onChange={(e) =>
              setConfig({ ...config, selectedProvider: e.target.value as any })
            }
            style={{
              padding: "14px",
              width: "100%",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              border: "2px solid var(--theme-border, #e2e8f0)",
              backgroundColor: "var(--theme-surface, #fff)",
              color: "var(--theme-text, #4a5568)",
              fontSize: "15px",
              appearance: "none",
              backgroundImage:
                'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22var(--theme-text, %234a5568)%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px top 50%",
              backgroundSize: "12px auto",
            }}
          >
            {PROVIDERS.map((p) => (
              <option
                key={p.value}
                value={p.value}
                style={{
                  backgroundColor: "var(--theme-surface, #fff)",
                  color: "var(--theme-text, #4a5568)",
                }}
              >
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </InputGroup>

      <InputGroup label={I18nService.t("api_key")}>
        <input
          type="password"
          value={config.apiKeys[config.selectedProvider] || ""}
          onChange={(e) =>
            setConfig({
              ...config,
              apiKeys: {
                ...config.apiKeys,
                [config.selectedProvider]: e.target.value,
              },
            })
          }
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "var(--theme-border-radius-medium, 10px)",
            border: "2px solid var(--theme-border, #e2e8f0)",
            fontSize: "15px",
            backgroundColor: "var(--theme-surface, #fff)",
            color: "var(--theme-text, #4a5568)",
          }}
          placeholder={`请输入 API Key`}
        />
      </InputGroup>

      {showBaseUrlInput && (
        <InputGroup
          label={`${I18nService.t("api_base_url")} ${config.selectedProvider === "custom" ? "(Required)" : "(Optional)"}`}
        >
          <input
            type="text"
            value={config.customBaseUrls[config.selectedProvider] || ""}
            onChange={(e) =>
              setConfig({
                ...config,
                customBaseUrls: {
                  ...config.customBaseUrls,
                  [config.selectedProvider]: e.target.value,
                },
              })
            }
            style={{
              padding: "14px",
              width: "100%",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              border: "2px solid var(--theme-border, #e2e8f0)",
              fontSize: "15px",
              backgroundColor: "var(--theme-surface, #fff)",
              color: "var(--theme-text, #4a5568)",
            }}
            placeholder={getBaseUrlPlaceholder(config.selectedProvider)}
          />
        </InputGroup>
      )}

      <InputGroup label={I18nService.t("model_select")}>
        {renderModelSelector()}
      </InputGroup>

      <div
        style={{
          marginTop: "28px",
          paddingTop: "24px",
          borderTop: "1px solid var(--theme-border, #edf2f7)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            style={{
              padding: "12px 20px",
              backgroundColor: isTesting
                ? "var(--theme-text-secondary, #cbd5e0)"
                : "var(--theme-primary, #3498db)",
              border: "none",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              cursor: isTesting ? "not-allowed" : "pointer",
              fontSize: "15px",
              color: "white",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              boxShadow: isTesting
                ? "none"
                : "var(--theme-shadow-small, 0 4px 6px rgba(52, 152, 219, 0.3))",
            }}
          >
            {isTesting ? "⏳ Testing..." : I18nService.t("test_connection")}
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: "12px 20px",
              backgroundColor: "var(--theme-secondary, #6c757d)",
              border: "none",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              cursor: "pointer",
              fontSize: "15px",
              color: "white",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              boxShadow:
                "var(--theme-shadow-small, 0 4px 6px rgba(108, 117, 125, 0.3))",
            }}
          >
            💾 {I18nService.t("save_changes")}
          </button>
        </div>

        {testResult && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px 20px",
              borderRadius: "var(--theme-border-radius-medium, 10px)",
              backgroundColor: testResult.success
                ? "var(--theme-success-bg, #e6ffed)"
                : "var(--theme-error-bg, #ffeef0)",
              color: testResult.success
                ? "var(--theme-success-text, #22543d)"
                : "var(--theme-error-text, #742a2a)",
              fontSize: "14px",
              lineHeight: "1.6",
              border: `2px solid ${
                testResult.success
                  ? "var(--theme-success-border, #c6f6d5)"
                  : "var(--theme-error-border, #feb2b2)"
              }`,
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "15px",
              }}
            >
              {testResult.success
                ? I18nService.t("connection_success")
                : I18nService.t("connection_failed")}
            </strong>
            {(() => {
              const successLabel = I18nService.t("connection_success").trim();
              const message = testResult.message?.trim();
              if (!message) return null;
              if (testResult.success && message === successLabel) return null;
              return message;
            })()}
          </div>
        )}
      </div>
    </Card>
  );
};

// Zhihu设置组件
interface PlatformSpecificSettingsProps {
  config: any;
  setConfig: (config: any) => void;
  platform: "zhihu" | "reddit" | "twitter" | "quora";
}

export const PlatformSpecificSettings: React.FC<
  PlatformSpecificSettingsProps
> = ({ config, setConfig, platform }) => {
  const platformName =
    platform === "zhihu"
      ? I18nService.t("settings_zhihu")
      : platform === "reddit"
        ? I18nService.t("settings_reddit")
        : platform === "twitter"
          ? I18nService.t("settings_twitter")
          : I18nService.t("settings_quora");
  const platformIcon =
    platform === "zhihu" ? (
      <img
        src="https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.a53ae37b.png"
        alt="Zhihu"
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          objectFit: "contain",
        }}
      />
    ) : platform === "reddit" ? (
      <img
        src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-120x120.png"
        alt="Reddit"
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          objectFit: "contain",
        }}
      />
    ) : platform === "twitter" ? (
      <img
        src="https://abs.twimg.com/icons/apple-touch-icon-192x192.png"
        alt="Twitter"
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          objectFit: "contain",
        }}
      />
    ) : (
      <img
        src="https://qsf.fs.quoracdn.net/-4-ans_frontend_assets.favicon-new.ico-26-e7e93fe0a7fbc991.ico"
        alt="Quora"
        style={{ width: "24px", height: "24px", objectFit: "contain" }}
      />
    );

  const platformConfig = config.platformConfigs?.[platform] || {};
  const isPlatformButtonEnabled = platformConfig.analysisButtonEnabled ?? true;
  const zhihuConfig = config.platformConfigs?.zhihu || {};
  const isCommentAnalysisEnabled = zhihuConfig.commentAnalysisEnabled ?? true;

  return (
    <Card title={platformName} icon={platformIcon}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px",
          backgroundColor: isPlatformButtonEnabled
            ? "var(--theme-success-bg, #f0fff4)"
            : "var(--theme-error-bg, #fff5f5)",
          borderRadius: "var(--theme-border-radius-medium, 10px)",
          marginBottom: "20px",
          border: `1px solid ${
            isPlatformButtonEnabled
              ? "var(--theme-success-border, #c6f6d5)"
              : "var(--theme-error-border, #feb2b2)"
          }`,
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            htmlFor={`platform-enabled-${platform}`}
            style={{
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "15px",
              color: isPlatformButtonEnabled
                ? "var(--theme-success-text, #22543d)"
                : "var(--theme-error-text, #742a2a)",
              display: "block",
            }}
          >
            {I18nService.t("analysis_button_toggle")}
          </label>
          <div
            style={{
              fontSize: "12px",
              color: isPlatformButtonEnabled
                ? "var(--theme-success-text, #2f855a)"
                : "var(--theme-error-text, #9b2c2c)",
              marginTop: "4px",
            }}
          >
            {I18nService.t("analysis_button_toggle_desc")}
          </div>
        </div>
        <div style={{ position: "relative", width: "46px", height: "28px" }}>
          <input
            type="checkbox"
            id={`platform-enabled-${platform}`}
            checked={isPlatformButtonEnabled}
            onChange={(e) =>
              setConfig({
                ...config,
                platformConfigs: {
                  ...(config.platformConfigs || {}),
                  [platform]: {
                    ...platformConfig,
                    analysisButtonEnabled: e.target.checked,
                  },
                },
              })
            }
            style={{
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          <label
            htmlFor={`platform-enabled-${platform}`}
            style={{
              position: "absolute",
              cursor: "pointer",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isPlatformButtonEnabled
                ? "var(--theme-success, #48bb78)"
                : "var(--theme-border, #ccc)",
              transition: ".4s",
              borderRadius: "999px",
            }}
          >
            <span
              style={{
                position: "absolute",
                height: "20px",
                width: "20px",
                left: isPlatformButtonEnabled ? "22px" : "4px",
                bottom: "4px",
                backgroundColor: "var(--theme-surface, white)",
                transition: ".4s",
                borderRadius: "50%",
              }}
            ></span>
          </label>
        </div>
      </div>

      {platform === "zhihu" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px",
            backgroundColor: isCommentAnalysisEnabled
              ? "var(--theme-success-bg, #f0fff4)"
              : "var(--theme-error-bg, #fff5f5)",
            borderRadius: "var(--theme-border-radius-medium, 10px)",
            marginBottom: "20px",
            border: `1px solid ${
              isCommentAnalysisEnabled
                ? "var(--theme-success-border, #c6f6d5)"
                : "var(--theme-error-border, #feb2b2)"
            }`,
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              htmlFor="zhihu-comment-analysis-enabled"
              style={{
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "15px",
                color: isCommentAnalysisEnabled
                  ? "var(--theme-success-text, #22543d)"
                  : "var(--theme-error-text, #742a2a)",
                display: "block",
              }}
            >
              {I18nService.t("comment_analysis_toggle")}
            </label>
            <div
              style={{
                fontSize: "12px",
                color: isCommentAnalysisEnabled
                  ? "var(--theme-success-text, #2f855a)"
                  : "var(--theme-error-text, #9b2c2c)",
                marginTop: "4px",
              }}
            >
              {I18nService.t("comment_analysis_toggle_desc")}
            </div>
          </div>
          <div style={{ position: "relative", width: "46px", height: "28px" }}>
            <input
              type="checkbox"
              id="zhihu-comment-analysis-enabled"
              checked={isCommentAnalysisEnabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  platformConfigs: {
                    ...(config.platformConfigs || {}),
                    zhihu: {
                      ...zhihuConfig,
                      commentAnalysisEnabled: e.target.checked,
                    },
                  },
                })
              }
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <label
              htmlFor="zhihu-comment-analysis-enabled"
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isCommentAnalysisEnabled
                  ? "var(--theme-success, #48bb78)"
                  : "var(--theme-border, #ccc)",
                transition: ".4s",
                borderRadius: "999px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: "20px",
                  width: "20px",
                  left: isCommentAnalysisEnabled ? "22px" : "4px",
                  bottom: "4px",
                  backgroundColor: "var(--theme-surface, white)",
                  transition: ".4s",
                  borderRadius: "50%",
                }}
              ></span>
            </label>
          </div>
        </div>
      )}

      <InputGroup
        label={I18nService.t("analysis_mode")}
        subLabel={
          config.platformAnalysisModes?.[platform] === "fast"
            ? I18nService.t("mode_fast_desc")
            : config.platformAnalysisModes?.[platform] === "balanced"
              ? I18nService.t("mode_balanced_desc")
              : I18nService.t("mode_deep_desc")
        }
      >
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {(["fast", "balanced", "deep"] as AnalysisMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() =>
                setConfig({
                  ...config,
                  platformAnalysisModes: {
                    ...config.platformAnalysisModes,
                    [platform]: mode,
                  },
                })
              }
              style={{
                flex: "1",
                minWidth: "120px",
                padding: "14px",
                borderRadius: "var(--theme-border-radius-medium, 10px)",
                border:
                  config.platformAnalysisModes?.[platform] === mode
                    ? "2px solid var(--theme-primary, #3498db)"
                    : "2px solid var(--theme-border, #e2e8f0)",
                backgroundColor:
                  config.platformAnalysisModes?.[platform] === mode
                    ? "var(--theme-primary, #e1f0fa)"
                    : "var(--theme-surface, white)",
                color:
                  config.platformAnalysisModes?.[platform] === mode
                    ? "var(--theme-primary-text, #ffffff)"
                    : "var(--theme-text, #4a5568)",
                cursor: "pointer",
                fontWeight:
                  config.platformAnalysisModes?.[platform] === mode
                    ? "700"
                    : "600",
                fontSize: "15px",
                transition: "all 0.2s",
                boxShadow:
                  config.platformAnalysisModes?.[platform] === mode
                    ? "var(--theme-shadow-small, 0 4px 8px rgba(52, 152, 219, 0.15))"
                    : "var(--theme-shadow-small, 0 2px 4px rgba(0,0,0,0.05))",
              }}
            >
              {mode === "fast" && I18nService.t("mode_fast")}
              {mode === "balanced" && I18nService.t("mode_balanced")}
              {mode === "deep" && I18nService.t("mode_deep")}
            </button>
          ))}
        </div>
      </InputGroup>

      <InputGroup
        label={`${I18nService.t("analyze_limit")}: ${config.analyzeLimit || 15}`}
      >
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={config.analyzeLimit || 15}
          onChange={(e) =>
            setConfig({ ...config, analyzeLimit: parseInt(e.target.value) })
          }
          style={{
            width: "100%",
            accentColor: "var(--theme-primary, #3498db)",
            height: "8px",
            borderRadius: "4px",
            border: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "var(--theme-text-secondary, #718096)",
            marginTop: "6px",
            position: "relative",
          }}
        >
          <span>5</span>
          <span
            style={{
              textAlign: "center",
              fontWeight: "600",
              color: "var(--theme-text, #2d3748)",
            }}
          >
            {config.analyzeLimit || 15}
          </span>
          <span>50</span>
        </div>
      </InputGroup>
    </Card>
  );
};

// 调试设置组件
interface DebugSettingsProps {
  config: any;
  setConfig: (config: any) => void;
}

export const DebugSettings: React.FC<DebugSettingsProps> = ({
  config,
  setConfig,
}) => {
  const observability = {
    ...DEFAULT_CONFIG.observability,
    ...(config.observability || {}),
  };
  const isDev =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV !== "production";

  const updateObservability = (patch: Partial<typeof observability>) => {
    setConfig({
      ...config,
      observability: {
        ...observability,
        ...patch,
      },
    });
  };

  return (
    <Card
      title={I18nService.t("settings_debug")}
      icon={<span style={{ fontSize: "24px" }}>🛠️</span>}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "14px",
          backgroundColor: "var(--theme-surface, #f8fafc)",
          borderRadius: "var(--theme-border-radius-medium, 8px)",
        }}
      >
        <input
          type="checkbox"
          id="enableDebug"
          checked={config.enableDebug || false}
          onChange={(e) =>
            setConfig({ ...config, enableDebug: e.target.checked })
          }
          style={{
            marginRight: "12px",
            width: "22px",
            height: "22px",
            accentColor: "var(--theme-primary, #3498db)",
            marginTop: "2px",
          }}
        />
        <div>
          <label
            htmlFor="enableDebug"
            style={{
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "15px",
              color: "var(--theme-text, #2d3748)",
              display: "block",
            }}
          >
            {I18nService.t("debug_mode")}
          </label>
          <div
            style={{
              fontSize: "13px",
              color: "var(--theme-text-secondary, #718096)",
              marginTop: "6px",
            }}
          >
            {I18nService.t("debug_mode_desc")}
          </div>
        </div>
      </div>

      {isDev && (
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--theme-border, #edf2f7)",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              marginBottom: "12px",
              color: "var(--theme-text, #2d3748)",
            }}
          >
            {I18nService.t("observability_settings")}
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              {
                key: "errorMonitoringEnabled",
                label: I18nService.t("observability_error"),
                desc: I18nService.t("observability_error_desc"),
              },
              {
                key: "analyticsEnabled",
                label: I18nService.t("observability_analytics"),
                desc: I18nService.t("observability_analytics_desc"),
              },
              {
                key: "performanceMonitoringEnabled",
                label: I18nService.t("observability_performance"),
                desc: I18nService.t("observability_performance_desc"),
              },
              {
                key: "complianceMonitoringEnabled",
                label: I18nService.t("observability_compliance"),
                desc: I18nService.t("observability_compliance_desc"),
              },
            ].map((item) => {
              const enabled = Boolean((observability as any)[item.key]);
              const inputId = `observability-${item.key}`;
              return (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: enabled
                      ? "var(--theme-success-bg, #f0fff4)"
                      : "var(--theme-error-bg, #fff5f5)",
                    borderRadius: "var(--theme-border-radius-medium, 10px)",
                    border: `1px solid ${
                      enabled
                        ? "var(--theme-success-border, #c6f6d5)"
                        : "var(--theme-error-border, #feb2b2)"
                    }`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor={inputId}
                      style={{
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: enabled
                          ? "var(--theme-success-text, #22543d)"
                          : "var(--theme-error-text, #742a2a)",
                        display: "block",
                      }}
                    >
                      {item.label}
                    </label>
                    <div
                      style={{
                        fontSize: "12px",
                        color: enabled
                          ? "var(--theme-success-text, #2f855a)"
                          : "var(--theme-error-text, #9b2c2c)",
                        marginTop: "4px",
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: "46px",
                      height: "28px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={enabled}
                      onChange={(e) =>
                        updateObservability({
                          [item.key]: e.target.checked,
                        } as any)
                      }
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0,
                      }}
                    />
                    <label
                      htmlFor={inputId}
                      style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: enabled
                          ? "var(--theme-success, #48bb78)"
                          : "var(--theme-border, #ccc)",
                        transition: ".4s",
                        borderRadius: "999px",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          height: "20px",
                          width: "20px",
                          left: enabled ? "22px" : "4px",
                          bottom: "4px",
                          backgroundColor: "var(--theme-surface, white)",
                          transition: ".4s",
                          borderRadius: "50%",
                        }}
                      ></span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
            {[
              {
                key: "allowInProd",
                label: I18nService.t("observability_prod_allow"),
                desc: I18nService.t("observability_prod_allow_desc"),
              },
              {
                key: "prodConsent",
                label: I18nService.t("observability_prod_consent"),
                desc: I18nService.t("observability_prod_consent_desc"),
              },
            ].map((item) => {
              const enabled = Boolean((observability as any)[item.key]);
              const inputId = `observability-${item.key}`;
              return (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: enabled
                      ? "var(--theme-success-bg, #f0fff4)"
                      : "var(--theme-error-bg, #fff5f5)",
                    borderRadius: "var(--theme-border-radius-medium, 10px)",
                    border: `1px solid ${
                      enabled
                        ? "var(--theme-success-border, #c6f6d5)"
                        : "var(--theme-error-border, #feb2b2)"
                    }`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor={inputId}
                      style={{
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: enabled
                          ? "var(--theme-success-text, #22543d)"
                          : "var(--theme-error-text, #742a2a)",
                        display: "block",
                      }}
                    >
                      {item.label}
                    </label>
                    <div
                      style={{
                        fontSize: "12px",
                        color: enabled
                          ? "var(--theme-success-text, #2f855a)"
                          : "var(--theme-error-text, #9b2c2c)",
                        marginTop: "4px",
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: "46px",
                      height: "28px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={enabled}
                      onChange={(e) =>
                        updateObservability({
                          [item.key]: e.target.checked,
                        } as any)
                      }
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0,
                      }}
                    />
                    <label
                      htmlFor={inputId}
                      style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: enabled
                          ? "var(--theme-success, #48bb78)"
                          : "var(--theme-border, #ccc)",
                        transition: ".4s",
                        borderRadius: "999px",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          height: "20px",
                          width: "20px",
                          left: enabled ? "22px" : "4px",
                          bottom: "4px",
                          backgroundColor: "var(--theme-surface, white)",
                          transition: ".4s",
                          borderRadius: "50%",
                        }}
                      ></span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "13px",
                color: "var(--theme-text, #555)",
              }}
            >
              {I18nService.t("observability_endpoint")}
            </label>
            <input
              type="text"
              value={observability.endpoint || ""}
              onChange={(e) =>
                updateObservability({ endpoint: e.target.value })
              }
              placeholder={I18nService.t("observability_endpoint_placeholder")}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--theme-border, #ddd)",
                borderRadius: "var(--theme-border-radius-small, 8px)",
                fontSize: "13px",
                backgroundColor: "var(--theme-surface, #fff)",
                color: "var(--theme-text, #000)",
              }}
            />
            <div
              style={{
                fontSize: "12px",
                color: "var(--theme-text-secondary, #718096)",
                marginTop: "4px",
              }}
            >
              {I18nService.t("observability_endpoint_desc")}
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "13px",
                color: "var(--theme-text, #555)",
              }}
            >
              {I18nService.t("observability_sample_rate")}:{" "}
              {observability.sampleRate}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={observability.sampleRate}
              onChange={(e) =>
                updateObservability({ sampleRate: Number(e.target.value) })
              }
              style={{
                width: "100%",
                accentColor: "var(--theme-primary, #3498db)",
                height: "8px",
                borderRadius: "4px",
                border: "none",
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

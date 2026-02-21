import React from "react";
import { AnalysisMode, ReplyAssistantSettings } from "~types";
import { colorWithAlpha } from "./utils";

const toneOptions = [
  "客观",
  "讽刺",
  "学术",
  "友好",
  "犀利",
  "简洁",
  "巨魔风格 (Troll)",
  "贴吧大神风格",
  "古早公知风格",
  "当代衍生变体",
];
const replyLengthOptions = [
  { value: "short", label: "简略" },
  { value: "medium", label: "标准" },
  { value: "long", label: "详细" },
] as const;

const analysisModes: AnalysisMode[] = ["fast", "balanced", "deep"];

interface SettingsPanelProps {
  panelPos: { left: number; top: number };
  panelWidth: number;
  themeState: any;
  logoSrc: string;
  siteSettings: {
    platformEnabled: boolean;
    analysisButtonEnabled: boolean;
    commentAnalysisEnabled: boolean;
    replyAssistantEnabled: boolean;
    analysisMode: AnalysisMode;
    analyzeLimit: number;
  };
  settings: ReplyAssistantSettings;
  reply: string;
  error: string | null;
  loading: boolean;
  canApply: boolean;
  onSiteToggleChange: (key: string, checked: boolean) => void;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  onAnalyzeLimitChange: (limit: number) => void;
  onToneChange: (tone: string) => void;
  onReplyLengthChange: (length: any) => void;
  onAutoFillChange: (checked: boolean) => void;
  onCopy: () => void;
  onApply: () => void;
  platformSettingsControls?: React.ReactNode;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  panelPos,
  panelWidth,
  themeState,
  logoSrc,
  siteSettings,
  settings,
  reply,
  error,
  loading,
  canApply,
  onSiteToggleChange,
  onAnalysisModeChange,
  onAnalyzeLimitChange,
  onToneChange,
  onReplyLengthChange,
  onAutoFillChange,
  onCopy,
  onApply,
  platformSettingsControls,
}) => {
  const primaryGlow = colorWithAlpha(themeState.primary, 0.34);
  const borderGlow = colorWithAlpha(themeState.accent, 0.24);
  const cardBg = themeState.isDark
    ? colorWithAlpha(themeState.surface, 0.95)
    : "rgba(255,255,255,0.96)";
  const chipBg = themeState.isDark ? "rgba(10,24,42,0.9)" : "#f8fbff";
  const inputBg = themeState.isDark ? "rgba(8,18,30,0.94)" : "#ffffff";
  const subtleBorder = `1px solid ${themeState.border}`;

  const backgroundGlows =
    "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 45%), radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.15), transparent 40%), radial-gradient(circle at 85% 10%, rgba(56, 189, 248, 0.12), transparent 30%)";

  return (
    <div
      style={{
        position: "fixed",
        left: panelPos.left,
        top: panelPos.top,
        width: panelWidth,
        maxHeight: "78vh",
        overflowY: "auto",
        zIndex: 2147483646,
        padding: 14,
        borderRadius: 16,
        border: `1px solid ${themeState.border}`,
        backgroundColor: themeState.background,
        backgroundImage: backgroundGlows,
        backgroundSize: "100% 100%",
        boxShadow: `0 0 0 1px ${themeState.border}, 0 20px 50px ${colorWithAlpha(themeState.primary, 0.2)}, ${themeState.shadow}`,
        color: themeState.text,
        fontFamily: themeState.fontFamily,
        backdropFilter: "blur(24px) saturate(140%) brightness(1.02)",
        WebkitBackdropFilter: "blur(24px) saturate(140%) brightness(1.02)",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: themeState.text,
          marginBottom: 10,
          padding: "10px 12px",
          borderRadius: 12,
          background: `linear-gradient(135deg, ${colorWithAlpha(themeState.primary, 0.2)}, ${colorWithAlpha(themeState.secondary, 0.16)})`,
          boxShadow: `0 4px 12px ${colorWithAlpha(themeState.primary, 0.15)}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <img src={logoSrc} alt="" style={{ width: 24, height: 24 }} />
        DeepProfile Assistant
      </div>

      {platformSettingsControls && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
            padding: 2,
            borderRadius: 12,
            boxShadow: `inset 0 0 0 1px ${themeState.border}`,
          }}
        >
          {platformSettingsControls}
        </div>
      )}

      <div
        style={{
          border: subtleBorder,
          borderRadius: 16,
          background: themeState.surface,
          padding: 16,
          marginBottom: 16,
          boxShadow: `0 4px 6px ${colorWithAlpha(themeState.shadow, 0.05)}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: themeState.textSecondary,
            marginBottom: 6,
          }}
        >
          Analysis Mode
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {analysisModes.map((mode) => {
            const active = siteSettings.analysisMode === mode;
            const label =
              mode === "fast"
                ? "Fast"
                : mode === "balanced"
                  ? "Balanced"
                  : "Deep";
            return (
              <button
                key={mode}
                onClick={() => onAnalysisModeChange(mode)}
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 8,
                  border: active
                    ? `1px solid ${themeState.primary}`
                    : subtleBorder,
                  background: active ? `${themeState.primary}22` : inputBg,
                  color: active ? themeState.primary : themeState.text,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 12,
            color: themeState.textSecondary,
            marginBottom: 6,
          }}
        >
          Analyze Limit: {siteSettings.analyzeLimit}
        </div>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={siteSettings.analyzeLimit}
          onChange={(e) => onAnalyzeLimitChange(parseInt(e.target.value, 10))}
          style={{ width: "100%", accentColor: themeState.primary }}
        />
      </div>

      <div
        style={{
          border: subtleBorder,
          borderRadius: 16,
          background: themeState.surface,
          padding: 16,
          marginBottom: 16,
          boxShadow: `0 4px 6px ${colorWithAlpha(themeState.shadow, 0.05)}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: themeState.textSecondary,
            marginBottom: 6,
          }}
        >
          AI Settings
        </div>
        <div
          style={{
            fontSize: 12,
            color: themeState.textSecondary,
            marginBottom: 6,
          }}
        >
          Tone
        </div>
        <select
          className="dp-select-focus"
          value={settings.tone}
          onChange={(e) => onToneChange(e.target.value)}
          style={{
            width: "100%",
            height: 40,
            border: subtleBorder,
            borderRadius: 8,
            marginBottom: 16,
            color: themeState.text,
            background: inputBg,
            padding: "0 12px",
            fontSize: 14,
            transition: "all 0.2s",
          }}
        >
          {toneOptions.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>

        <div
          style={{
            fontSize: 12,
            color: themeState.textSecondary,
            marginBottom: 6,
          }}
        >
          Reply Length
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {replyLengthOptions.map((item) => {
            const active = settings.replyLength === item.value;
            return (
              <button
                key={item.value}
                onClick={() => onReplyLengthChange(item.value)}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 8,
                  border: active
                    ? `1px solid ${themeState.primary}`
                    : subtleBorder,
                  background: active ? `${themeState.primary}22` : inputBg,
                  color: active ? themeState.primary : themeState.text,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: themeState.text,
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={settings.autoFill}
            onChange={(e) => onAutoFillChange(e.target.checked)}
          />
          Auto-fill input
        </label>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: themeState.error,
            background: `${themeState.error}22`,
            border: `1px solid ${themeState.error}66`,
            borderRadius: 8,
            padding: "7px 8px",
          }}
        >
          {error}
        </div>
      )}

      {reply && (
        <>
          <textarea
            readOnly
            value={reply}
            style={{
              width: "100%",
              minHeight: 90,
              marginTop: 8,
              padding: 8,
              border: subtleBorder,
              borderRadius: 8,
              resize: "vertical",
              color: themeState.text,
              background: inputBg,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              onClick={onCopy}
              style={{
                height: 32,
                borderRadius: 8,
                border: subtleBorder,
                background: chipBg,
                color: themeState.text,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
            <button
              onClick={onApply}
              disabled={!canApply}
              style={{
                height: 32,
                borderRadius: 8,
                border: "none",
                background: canApply ? themeState.primary : "#94a3b8",
                color: themeState.primaryText,
                cursor: canApply ? "pointer" : "not-allowed",
              }}
            >
              Fill Input
            </button>
          </div>
        </>
      )}
    </div>
  );
};

import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigService } from "~services/ConfigService";
import {
  clampFloatingBallPos,
  computeFloatingPanelPosition,
} from "./zhihu-reply-assistant-utils";
import { FloatingBall } from "./reply-assistant-ui/FloatingBall";
import { SettingsPanel } from "./reply-assistant-ui/SettingsPanel";
import {
  FLOATING_BALL_MARGIN,
  FLOATING_BALL_SIZE,
} from "./reply-assistant-ui/utils";
import { EN_TONE_OPTIONS, INLINE_CONTAINER_CLASS, INLINE_REPLY_BTN_CLASS, INLINE_TONE_CLASS } from "./reply-assistant-shared/tone-options";
import type { EditableTarget, ReplyContext } from "./reply-assistant-shared/types";
import { setEditableText as setSharedEditableText } from "./reply-assistant-shared/editable";
import { DEFAULT_REPLY_SETTINGS_EN } from "./reply-assistant-shared/defaults";
import { useReplyAssistantConfig } from "./reply-assistant-shared/useReplyAssistantConfig";
import { useReplyGeneration } from "./reply-assistant-shared/useReplyGeneration";
import { useFloatingBallState } from "./reply-assistant-shared/useFloatingBallState";
import { createInlineControls } from "./reply-assistant-shared/createInlineControls";

export const config: PlasmoCSConfig = {
  matches: ["https://www.quora.com/*"],
};

const BALL_POSITION_STORAGE_KEY = "deep_profile_quora_ball_pos";
const toneOptions = EN_TONE_OPTIONS;

const extractReplyContext = (targetInput: EditableTarget): ReplyContext => {
  let targetUser = "Author";
  let answerContent = "";
  const conversation: ReplyContext["conversation"] = [];

  // Try to find the question title
  const questionTitle =
    document.querySelector(".q-text.qu-dynamicFontSize--xlarge")?.textContent ||
    document.title;

  // Try to find context for comment
  const commentContainer = targetInput.closest(".q-box.qu-borderAll");
  if (commentContainer) {
    // Look up for the parent answer/post
    // This is tricky on Quora's dynamic DOM
    const parentItem = targetInput.closest(".q-box.qu-pb--medium");
    if (parentItem) {
      const author =
        parentItem.querySelector(".q-text.qu-bold")?.textContent || "User";
      const content =
        parentItem.querySelector(".q-text.qu-truncateLines--5")?.textContent ||
        "";
      targetUser = author;
      answerContent = content;
    }
  } else {
    // Answer editor
    // The question is the context
    answerContent = questionTitle;
  }

  if (answerContent) {
    conversation.push({
      author: targetUser,
      content: answerContent,
      isTarget: true,
    });
  }

  return {
    targetUser,
    pageTitle: questionTitle,
    answerContent,
    conversation,
    targetInput,
  };
};

const setEditableText = (target: EditableTarget, value: string) =>
  setSharedEditableText(target, value);

const FloatingReplyAssistant = () => {
  const [open, setOpen] = useState(false);
  const {
    settings,
    setSettings,
    siteSettings,
    setSiteSettings,
    enabled,
    themeState,
    saveSettings,
    updateConfig,
  } = useReplyAssistantConfig({
    platform: "quora",
    defaultSettings: DEFAULT_REPLY_SETTINGS_EN,
    themeFallback: {
      primary: "#b92b27",
      secondary: "#b92b27",
      text: "#282829",
      textSecondary: "#636466",
      border: "#dee0e1",
      surface: "#ffffff",
      background: "#ffffff",
      accent: "#b92b27",
      primaryText: "#ffffff",
      success: "#27ae60",
      error: "#e74c3c",
      fontFamily: "sans-serif",
      shadow: "0 8px 24px rgba(0,0,0,0.15)",
    },
  });
  const [logoSrc, setLogoSrc] = useState("");
  const activeTargetRef = useRef<EditableTarget | null>(null);
  const floatingInlineBarRef = useRef<HTMLDivElement | null>(null);

  const clampBallPos = (pos: { left: number; top: number }) => ({
    ...clampFloatingBallPos(
      pos,
      { width: window.innerWidth, height: window.innerHeight },
      FLOATING_BALL_SIZE,
      FLOATING_BALL_MARGIN,
    ),
  });
  const { ballPos, onBallPointerDown } = useFloatingBallState({
    storageKey: BALL_POSITION_STORAGE_KEY,
    clampPos: clampBallPos,
    onToggleOpen: () => setOpen((v) => !v),
    initialPos: {
      left: Math.max(window.innerWidth - FLOATING_BALL_SIZE - 24, 16),
      top: Math.max(window.innerHeight - 160, 16),
    },
  });

  const logoCandidates = useMemo(
    () => [
      new URL("../../assets/icon.png", import.meta.url).toString(),
      chrome.runtime.getURL("icon.png"),
      chrome.runtime.getURL("assets/icon.png"),
    ],
    [],
  );

  useEffect(() => {
    setLogoSrc(logoCandidates[0]);
  }, [logoCandidates]);

  const onToneChange = async (tone: string) => {
    const next = { ...settings, tone };
    setSettings(next);
    await saveSettings(next);
  };

  const onReplyLengthChange = async (length: any) => {
    const next = { ...settings, replyLength: length };
    setSettings(next);
    await saveSettings(next);
  };

  const onSiteToggleChange = async (key: string, checked: boolean) => {
    if (key === "platformEnabled") {
      await updateConfig((cfg) => ({
        ...cfg,
        enabledPlatforms: { ...cfg.enabledPlatforms, quora: checked },
      }));
      setSiteSettings((prev) => ({ ...prev, platformEnabled: checked }));
    }
    if (key === "replyAssistantEnabled") {
      const config = await ConfigService.getConfig();
      const quoraConfig = config.platformConfigs.quora;
      await ConfigService.saveConfig({
        ...config,
        platformConfigs: {
          ...config.platformConfigs,
          quora: { ...quoraConfig, replyAssistantEnabled: checked },
        },
      });
      setSiteSettings((prev) => ({ ...prev, replyAssistantEnabled: checked }));
    }
  };
  const { loading, error, reply, generateReply, onCopy, onApply } =
    useReplyGeneration({
      platform: "quora",
      settings,
      activeTargetRef,
      setEditableText,
      extractContext: extractReplyContext,
    });

  const ensureFloatingInlineBar = () => {
    if (floatingInlineBarRef.current?.isConnected) {
      return floatingInlineBarRef.current;
    }
    const controls = createInlineControls({
      toneOptions,
      tone: settings.tone,
      classes: {
        container: INLINE_CONTAINER_CLASS,
        toneSelect: INLINE_TONE_CLASS,
        replyBtn: INLINE_REPLY_BTN_CLASS,
      },
      style: {
        container: `
          position: fixed;
          z-index: 2147483646;
          display: none;
          align-items: center;
          gap: 8px;
          padding: 6px;
          border-radius: 10px;
          border: 1px solid ${themeState.isDark ? "#474a4e" : "#d0d7e2"};
          background: ${themeState.isDark ? "#1e1f22" : "#ffffff"};
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        `,
        toneSelect: `
          height: 30px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid ${themeState.isDark ? "#474a4e" : "#dee0e1"};
          background: ${themeState.isDark ? "#272729" : "#ffffff"};
          color: ${themeState.text};
          font-size: 12px;
          outline: none;
        `,
        replyBtn: `
          height: 30px;
          padding: 0 12px;
          border-radius: 99px;
          background: ${themeState.primary}22;
          color: ${themeState.primary};
          font-weight: 700;
          font-size: 12px;
          border: 1px solid ${themeState.primary}44;
          cursor: pointer;
        `,
      },
      buttonText: "AI",
      loadingText: "Generating...",
      onToneChange,
      onGenerate: () => generateReply(activeTargetRef.current),
    });
    document.body.appendChild(controls.container);
    floatingInlineBarRef.current = controls.container;
    return controls.container;
  };

  useEffect(() => {
    if (!enabled) return;

    const isLikelyQuoraEditor = (el: Element): el is EditableTarget => {
      if (
        !(el instanceof HTMLTextAreaElement) &&
        !(
          el instanceof HTMLElement &&
          el.getAttribute("contenteditable") === "true"
        )
      ) {
        return false;
      }
      const hint = (
        el.getAttribute("placeholder") ||
        el.getAttribute("data-placeholder") ||
        el.getAttribute("aria-label") ||
        el.getAttribute("class") ||
        ""
      ).toLowerCase();
      return (
        hint.includes("comment") ||
        hint.includes("reply") ||
        hint.includes("answer") ||
        hint.includes("write") ||
        hint.includes("doc") ||
        !!el.closest(
          ".q-flex.qu-my--tiny.qu-alignItems--flex-end, .q-textArea, #editor",
        )
      );
    };

    const hideBar = () => {
      if (floatingInlineBarRef.current) {
        floatingInlineBarRef.current.style.display = "none";
      }
    };

    const showBarForTarget = (target: EditableTarget) => {
      activeTargetRef.current = target;
      const bar = ensureFloatingInlineBar();
      const rect = target.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 340));
      const top = Math.max(
        8,
        Math.min(rect.bottom + 8, window.innerHeight - 60),
      );
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
      bar.style.display = "inline-flex";
    };

    const updateBarPosition = () => {
      const target = activeTargetRef.current;
      const bar = floatingInlineBarRef.current;
      if (!target || !bar || bar.style.display === "none") return;
      const rect = target.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 340));
      const top = Math.max(
        8,
        Math.min(rect.bottom + 8, window.innerHeight - 60),
      );
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
    };

    const findEditorFromNode = (node: Element): EditableTarget | null => {
      if (isLikelyQuoraEditor(node)) return node;
      const editor = node.querySelector(
        ".doc[contenteditable='true'], [data-placeholder*='reply'][contenteditable='true'], textarea, div[contenteditable='true']",
      );
      if (editor && isLikelyQuoraEditor(editor))
        return editor as EditableTarget;
      return null;
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const editor = findEditorFromNode(target);
      if (editor) showBarForTarget(editor);
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (
        target instanceof HTMLOptionElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      const bar = floatingInlineBarRef.current;
      if (bar?.contains(target)) return;
      const editor = findEditorFromNode(target);
      if (editor) {
        showBarForTarget(editor);
        return;
      }
      hideBar();
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", updateBarPosition, true);
    window.addEventListener("resize", updateBarPosition);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", updateBarPosition, true);
      window.removeEventListener("resize", updateBarPosition);
      if (floatingInlineBarRef.current) {
        floatingInlineBarRef.current.remove();
        floatingInlineBarRef.current = null;
      }
    };
  }, [enabled, themeState]);

  useEffect(() => {
    const bar = floatingInlineBarRef.current;
    if (!bar) return;
    const button = bar.querySelector(
      `.${INLINE_REPLY_BTN_CLASS}`,
    ) as HTMLButtonElement | null;
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Generating..." : "AI";
    button.style.opacity = loading ? "0.75" : "1";
    button.style.cursor = loading ? "not-allowed" : "pointer";
  }, [loading]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as HTMLElement;
      const root = document.getElementById("deep-profile-quora-reply-root");
      if (!root) return;

      const panel = root.querySelector("div[style*='position: fixed']");
      const ball = root.querySelector("button");

      if (panel && panel.contains(target)) return;
      if (ball && ball.contains(target)) return;

      setOpen(false);
    };

    if (open) {
      document.addEventListener("pointerdown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [open]);

  const panelWidth = 368;
  const panelGap = 10;
  const panelMaxHeight = Math.floor(window.innerHeight * 0.78);
  const panelPos = computeFloatingPanelPosition(
    ballPos,
    { width: window.innerWidth, height: window.innerHeight },
    { width: panelWidth, height: Math.min(620, panelMaxHeight) },
    FLOATING_BALL_SIZE,
    panelGap,
    10,
  );

  if (!enabled) return null;

  return (
    <>
      <FloatingBall
        ballPos={ballPos}
        themeState={themeState}
        logoSrc={logoSrc || logoCandidates[0]}
        onPointerDown={onBallPointerDown}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onError={() => {}}
      />
      {open && (
        <SettingsPanel
          panelPos={{ left: panelPos.left, top: panelPos.top }}
          panelWidth={panelWidth}
          themeState={themeState}
          logoSrc={logoSrc}
          siteSettings={siteSettings}
          settings={settings}
          toneOptions={toneOptions}
          reply={reply}
          error={error}
          loading={loading}
          canApply={!!reply}
          onSiteToggleChange={onSiteToggleChange as any}
          onAnalysisModeChange={() => {}}
          onAnalyzeLimitChange={() => {}}
          onToneChange={onToneChange}
          onReplyLengthChange={onReplyLengthChange}
          onCopy={onCopy}
          onApply={onApply}
          platformSettingsControls={
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeState.border}`,
                  background: themeState.isDark
                    ? "rgba(10,24,42,0.9)"
                    : "#f8fbff",
                  fontSize: 12,
                }}
              >
                Platform
                <input
                  type="checkbox"
                  checked={siteSettings.platformEnabled}
                  onChange={(e) =>
                    onSiteToggleChange("platformEnabled", e.target.checked)
                  }
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeState.border}`,
                  background: themeState.isDark
                    ? "rgba(10,24,42,0.9)"
                    : "#f8fbff",
                  fontSize: 12,
                }}
              >
                Assistant
                <input
                  type="checkbox"
                  checked={siteSettings.replyAssistantEnabled}
                  onChange={(e) =>
                    onSiteToggleChange(
                      "replyAssistantEnabled",
                      e.target.checked,
                    )
                  }
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeState.border}`,
                  background: themeState.isDark
                    ? "rgba(10,24,42,0.9)"
                    : "#f8fbff",
                  fontSize: 12,
                }}
              >
                Analysis Btn
                <input
                  type="checkbox"
                  checked={siteSettings.analysisButtonEnabled}
                  onChange={(e) =>
                    onSiteToggleChange(
                      "analysisButtonEnabled",
                      e.target.checked,
                    )
                  }
                />
              </label>
            </>
          }
        />
      )}
    </>
  );
};

const mount = () => {
  const id = "deep-profile-quora-reply-root";
  if (document.getElementById(id)) return;
  const root = document.createElement("div");
  root.id = id;
  document.body.appendChild(root);
  createRoot(root).render(<FloatingReplyAssistant />);
};

mount();

export default function QuoraReplyAssistant() {
  return null;
}

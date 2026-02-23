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
import {
  isContentEditableElement,
  isVisible,
  setEditableText as setSharedEditableText,
} from "./reply-assistant-shared/editable";
import { DEFAULT_REPLY_SETTINGS_EN } from "./reply-assistant-shared/defaults";
import { useReplyAssistantConfig } from "./reply-assistant-shared/useReplyAssistantConfig";
import { useReplyGeneration } from "./reply-assistant-shared/useReplyGeneration";
import { useFloatingBallState } from "./reply-assistant-shared/useFloatingBallState";
import { createInlineControls } from "./reply-assistant-shared/createInlineControls";

export const config: PlasmoCSConfig = {
  matches: ["https://www.reddit.com/*"],
};

const BALL_POSITION_STORAGE_KEY = "deep_profile_reddit_ball_pos";

const toneOptions = EN_TONE_OPTIONS;

const isEditableTarget = (el: Element | null): el is EditableTarget => {
  if (!el) return false;
  return el instanceof HTMLTextAreaElement || isContentEditableElement(el);
};

const findEditableInContainer = (container: Element): EditableTarget | null => {
  // Try Shadow DOM first for shreddit
  if (container.tagName.toLowerCase().includes("composer")) {
    if (container.shadowRoot) {
      const editable = container.shadowRoot.querySelector(
        "textarea, [contenteditable]",
      );
      if (editable) return editable as HTMLElement;
    }
  }

  const inputs = Array.from(
    container.querySelectorAll("textarea, [contenteditable]"),
  );
  const visibleInput = inputs.find((el) => isVisible(el));
  return (visibleInput as EditableTarget) || null;
};

const extractReplyContext = (targetInput: EditableTarget): ReplyContext => {
  let targetUser = "OP";
  let pageTitle = document.title;
  let answerContent = "";
  const conversation: ReplyContext["conversation"] = [];

  // Try to find the parent comment or post
  const parentComment = targetInput.closest("shreddit-comment");
  const parentPost =
    targetInput.closest("shreddit-post") ||
    document.querySelector("shreddit-post");

  if (parentComment) {
    targetUser = parentComment.getAttribute("author") || "User";
    // Try to get content text
    const contentDiv =
      parentComment.querySelector("div[slot='comment']") || parentComment;
    answerContent = contentDiv.textContent?.trim().slice(0, 500) || "";
  } else if (parentPost) {
    targetUser = parentPost.getAttribute("author") || "OP";
    pageTitle = parentPost.getAttribute("post-title") || document.title;
    const contentDiv =
      parentPost.querySelector("[slot='text-body']") || parentPost;
    answerContent = contentDiv.textContent?.trim().slice(0, 1000) || "";
  }

  // Conversation history (simplified: just the immediate parent)
  if (answerContent) {
    conversation.push({
      author: targetUser,
      content: answerContent,
      isTarget: true,
    });
  }

  return {
    targetUser,
    pageTitle,
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
    platform: "reddit",
    defaultSettings: DEFAULT_REPLY_SETTINGS_EN,
    themeFallback: {
      primary: "#FF4500",
      secondary: "#9494FF",
      text: "#1c1c1c",
      textSecondary: "#6a6a6a",
      border: "#ccc",
      surface: "#ffffff",
      background: "#dae0e6",
      accent: "#FF4500",
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
    clampDuringDrag: true,
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

  // UI Handlers
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
        enabledPlatforms: { ...cfg.enabledPlatforms, reddit: checked },
      }));
      setSiteSettings((prev) => ({ ...prev, platformEnabled: checked }));
    }
    if (key === "replyAssistantEnabled") {
      // Update nested config
      const config = await ConfigService.getConfig();
      const redditConfig = config.platformConfigs.reddit;
      await ConfigService.saveConfig({
        ...config,
        platformConfigs: {
          ...config.platformConfigs,
          reddit: { ...redditConfig, replyAssistantEnabled: checked },
        },
      });
      setSiteSettings((prev) => ({ ...prev, replyAssistantEnabled: checked }));
    }
    // Implement other toggles if needed or genericize
  };
  const { loading, error, reply, generateReply, onCopy, onApply } =
    useReplyGeneration({
      platform: "reddit",
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
          height: 32px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid ${themeState.isDark ? "#474a4e" : "#ccc"};
          background: ${themeState.isDark ? "#272729" : "#ffffff"};
          color: ${themeState.text};
          font-size: 12px;
          outline: none;
        `,
        replyBtn: `
          height: 32px;
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
      buttonText: "AI Reply",
      loadingText: "Generating...",
      onToneChange,
      onGenerate: () => generateReply(activeTargetRef.current),
    });
    document.body.appendChild(controls.container);
    floatingInlineBarRef.current = controls.container;
    return controls.container;
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as HTMLElement;
      // Check if click is inside the panel or the floating ball
      const root = document.getElementById("deep-profile-reddit-reply-root");
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

  useEffect(() => {
    if (!enabled) return;

    const hideBar = () => {
      if (floatingInlineBarRef.current) {
        floatingInlineBarRef.current.style.display = "none";
      }
    };

    const showBarForTarget = (target: EditableTarget) => {
      activeTargetRef.current = target;
      const bar = ensureFloatingInlineBar();
      const rect = target.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
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
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
      const top = Math.max(
        8,
        Math.min(rect.bottom + 8, window.innerHeight - 60),
      );
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
    };

    const findEditableFromNode = (node: Element): EditableTarget | null => {
      if (isEditableTarget(node)) return node;
      const inSame = node.querySelector(
        "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
      );
      if (isEditableTarget(inSame)) return inSame;

      const composer = node.closest(
        "shreddit-comment-composer, shreddit-post-composer",
      );
      if (composer) {
        const found = findEditableInContainer(composer);
        if (found) return found;
      }
      return null;
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const editable = findEditableFromNode(target);
      if (editable) {
        showBarForTarget(editable);
      }
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
      const editable = findEditableFromNode(target);
      if (editable) {
        showBarForTarget(editable);
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
    button.textContent = loading ? "Generating..." : "AI Reply";
    button.style.opacity = loading ? "0.75" : "1";
    button.style.cursor = loading ? "not-allowed" : "pointer";
  }, [loading]);

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
        onError={() => {
          const current = logoSrc || logoCandidates[0];
          const index = logoCandidates.indexOf(current);
          const next = logoCandidates[index + 1];
          if (next) {
            setLogoSrc(next);
          }
        }}
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
  const id = "deep-profile-reddit-reply-root";
  if (document.getElementById(id)) return;
  const root = document.createElement("div");
  root.id = id;
  document.body.appendChild(root);
  createRoot(root).render(<FloatingReplyAssistant />);
};

mount();

export default function RedditReplyAssistant() {
  return null;
}

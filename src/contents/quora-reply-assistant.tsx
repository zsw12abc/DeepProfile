import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigService } from "~services/ConfigService";
import {
  DEFAULT_CONFIG,
  type AnalysisMode,
  type ReplyAssistantSettings,
} from "~types";
import {
  clampFloatingBallPos,
  computeFloatingPanelPosition,
  isDarkThemeId,
} from "./zhihu-reply-assistant-utils";
import { FloatingBall } from "./reply-assistant-ui/FloatingBall";
import { SettingsPanel } from "./reply-assistant-ui/SettingsPanel";
import {
  FLOATING_BALL_MARGIN,
  FLOATING_BALL_SIZE,
} from "./reply-assistant-ui/utils";
import { requestGeneratedReply } from "./reply-assistant-language-utils";

export const config: PlasmoCSConfig = {
  matches: ["https://www.quora.com/*"],
};

type EditableTarget = HTMLTextAreaElement | HTMLElement;

type ConversationItem = {
  author: string;
  content: string;
  isTarget?: boolean;
};

type ReplyContext = {
  targetUser: string;
  pageTitle?: string;
  answerContent?: string;
  conversation: ConversationItem[];
  targetInput: EditableTarget;
};

const BALL_POSITION_STORAGE_KEY = "deep_profile_quora_ball_pos";

const toneOptions = [
  "Troll",
  "Forum Meme Lord",
  "Classic Public Intellectual",
  "Deconstructive Parody",
  "Objective",
  "Sarcastic",
  "Academic",
  "Friendly",
  "Witty",
  "Concise",
];
const INLINE_REPLY_BTN_CLASS = "deep-profile-inline-reply-btn";
const INLINE_TONE_CLASS = "deep-profile-inline-tone-select";
const INLINE_CONTAINER_CLASS = "deep-profile-inline-controls";

const extractReplyContext = (targetInput: EditableTarget): ReplyContext => {
  let targetUser = "Author";
  let answerContent = "";
  const conversation: ConversationItem[] = [];

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

const setEditableText = (target: EditableTarget, value: string) => {
  if (target instanceof HTMLTextAreaElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.focus();
    return;
  }

  target.focus();
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const inserted = document.execCommand("insertText", false, value);
    if (!inserted) {
      target.textContent = value;
    }
  } catch {
    target.textContent = value;
  }
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
};

const FloatingReplyAssistant = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState<ReplyAssistantSettings>({
    tone: "Objective",
    replyLength: "medium",
  });
  const [siteSettings, setSiteSettings] = useState({
    platformEnabled: true,
    analysisButtonEnabled: true,
    commentAnalysisEnabled: true,
    replyAssistantEnabled: true,
    analysisMode: "balanced" as AnalysisMode,
    analyzeLimit: 15,
  });
  const [themeState, setThemeState] = useState(() => {
    const defaultTheme = DEFAULT_CONFIG.themes[DEFAULT_CONFIG.themeId];
    return {
      isDark: isDarkThemeId(DEFAULT_CONFIG.themeId),
      primary: defaultTheme?.colors.primary || "#b92b27", // Quora Red
      secondary: defaultTheme?.colors.secondary || "#b92b27",
      text: defaultTheme?.colors.text || "#282829",
      textSecondary: defaultTheme?.colors.textSecondary || "#636466",
      border: defaultTheme?.colors.border || "#dee0e1",
      surface: defaultTheme?.colors.surface || "#ffffff",
      background: defaultTheme?.colors.background || "#ffffff",
      accent: defaultTheme?.colors.accent || "#b92b27",
      primaryText: defaultTheme?.colors.primaryText || "#ffffff",
      success: defaultTheme?.colors.success || "#27ae60",
      error: defaultTheme?.colors.error || "#e74c3c",
      fontFamily: defaultTheme?.typography.fontFamily || "sans-serif",
      shadow: defaultTheme?.shadows.large || "0 8px 24px rgba(0,0,0,0.15)",
    };
  });
  const [logoSrc, setLogoSrc] = useState("");
  const [ballPos, setBallPos] = useState(() => ({
    left: Math.max(window.innerWidth - FLOATING_BALL_SIZE - 24, 16),
    top: Math.max(window.innerHeight - 160, 16),
  }));
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

  const saveSettings = async (next: ReplyAssistantSettings) => {
    const config = await ConfigService.getConfig();
    const quoraConfig = config.platformConfigs.quora;
    await ConfigService.saveConfig({
      ...config,
      platformConfigs: {
        ...config.platformConfigs,
        quora: {
          ...quoraConfig,
          settings: {
            ...(quoraConfig.settings || {}),
            replyAssistant: next,
          },
        },
      },
    });
  };

  const updateConfig = async (updater: (cfg: any) => any) => {
    const current = await ConfigService.getConfig();
    const next = updater(current);
    await ConfigService.saveConfig(next);
  };

  useEffect(() => {
    const loadSettings = async () => {
      const config = await ConfigService.getConfig();
      const quoraConfig = config.platformConfigs.quora;
      const assistantSettings = quoraConfig.settings?.replyAssistant || {
        tone: "Objective",
        replyLength: "medium",
      };

      setSettings({
        tone: assistantSettings.tone || "Objective",
        replyLength: assistantSettings.replyLength || "medium",
      });

      setSiteSettings({
        platformEnabled: config.enabledPlatforms?.quora ?? true,
        analysisButtonEnabled: quoraConfig.analysisButtonEnabled ?? true,
        commentAnalysisEnabled: false,
        replyAssistantEnabled: quoraConfig.replyAssistantEnabled ?? true,
        analysisMode: config.platformAnalysisModes?.quora ?? "balanced",
        analyzeLimit: config.analyzeLimit || 15,
      });

      setEnabled(
        (config.globalEnabled ?? true) &&
          (quoraConfig.replyAssistantEnabled ?? true),
      );

      const activeTheme =
        config.themes?.[config.themeId] ||
        DEFAULT_CONFIG.themes[config.themeId];
      if (activeTheme) {
        setThemeState({
          isDark: isDarkThemeId(config.themeId),
          primary: activeTheme.colors.primary,
          secondary: activeTheme.colors.secondary,
          text: activeTheme.colors.text,
          textSecondary: activeTheme.colors.textSecondary,
          border: activeTheme.colors.border,
          surface: activeTheme.colors.surface,
          background: activeTheme.colors.background,
          accent: activeTheme.colors.accent,
          primaryText: activeTheme.colors.primaryText,
          success: activeTheme.colors.success,
          error: activeTheme.colors.error,
          fontFamily: activeTheme.typography.fontFamily,
          shadow: activeTheme.shadows.large,
        });
      }
    };

    loadSettings();
    const onStorageChange = async (changes: any, areaName: string) => {
      if (areaName === "local" && changes.deep_profile_config) {
        await loadSettings();
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

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

  const generateReply = async (target: EditableTarget) => {
    setLoading(true);
    setError(null);
    try {
      const context = extractReplyContext(target);
      const generated = await requestGeneratedReply({
        platform: "quora",
        tone: settings.tone,
        replyLength: settings.replyLength,
        context: {
          targetUser: context.targetUser,
          pageTitle: context.pageTitle,
          answerContent: context.answerContent,
          conversation: context.conversation,
        },
        targetInput: target,
      });

      setReply(generated.reply);
      setEditableText(target, generated.reply);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
  };

  const onApply = () => {
    const target = activeTargetRef.current;
    if (!target || !reply) return;
    setEditableText(target, reply);
  };

  const onBallPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = ballPos.left;
    const startTop = ballPos.top;
    let dragging = false;

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragging = true;

      setBallPos({
        left: startLeft + dx,
        top: startTop + dy,
      });
    };

    const handleUp = async (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      if (!dragging) {
        setOpen((v) => !v);
      } else {
        const finalPos = clampBallPos({
          left: startLeft + (upEvent.clientX - startX),
          top: startTop + (upEvent.clientY - startY),
        });
        setBallPos(finalPos);
        try {
          await chrome.storage.local.set({
            [BALL_POSITION_STORAGE_KEY]: finalPos,
          });
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const ensureFloatingInlineBar = () => {
    if (floatingInlineBarRef.current?.isConnected) {
      return floatingInlineBarRef.current;
    }

    const container = document.createElement("div");
    container.className = INLINE_CONTAINER_CLASS;
    container.style.cssText = `
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
    `;

    const toneSelect = document.createElement("select");
    toneSelect.className = INLINE_TONE_CLASS;
    toneSelect.style.cssText = `
      height: 30px;
      padding: 0 8px;
      border-radius: 8px;
      border: 1px solid ${themeState.isDark ? "#474a4e" : "#dee0e1"};
      background: ${themeState.isDark ? "#272729" : "#ffffff"};
      color: ${themeState.text};
      font-size: 12px;
      outline: none;
    `;
    toneOptions.forEach((tone) => {
      const option = document.createElement("option");
      option.value = tone;
      option.textContent = tone;
      toneSelect.appendChild(option);
    });
    toneSelect.value = settings.tone;
    toneSelect.onchange = async (e) => {
      await onToneChange((e.target as HTMLSelectElement).value);
    };

    const aiBtn = document.createElement("button");
    aiBtn.textContent = "AI";
    aiBtn.className = INLINE_REPLY_BTN_CLASS;
    aiBtn.style.cssText = `
      height: 30px;
      padding: 0 12px;
      border-radius: 99px;
      background: ${themeState.primary}22;
      color: ${themeState.primary};
      font-weight: 700;
      font-size: 12px;
      border: 1px solid ${themeState.primary}44;
      cursor: pointer;
    `;
    aiBtn.onclick = (e) => {
      e.preventDefault();
      const target = activeTargetRef.current;
      if (!target) return;
      generateReply(target);
    };

    container.appendChild(toneSelect);
    container.appendChild(aiBtn);
    document.body.appendChild(container);
    floatingInlineBarRef.current = container;
    return container;
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

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
  matches: ["https://twitter.com/*", "https://x.com/*"],
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

const BALL_POSITION_STORAGE_KEY = "deep_profile_twitter_ball_pos";

// Twitter/X specific selectors
const INPUT_SELECTOR = "[data-testid^='tweetTextarea_']";
const TWEET_SELECTOR = "[data-testid='tweet']";
const USER_NAME_SELECTOR = "[data-testid='User-Name']";
const TWEET_TEXT_SELECTOR = "[data-testid='tweetText']";
const TOOLBAR_SELECTOR = "[data-testid='toolBar']";

const toneOptions = [
  "Objective",
  "Sarcastic",
  "Academic",
  "Friendly",
  "Witty",
  "Concise",
  "Troll",
  "Forum Meme Lord",
  "Classic Public Intellectual",
  "Deconstructive Parody",
];
const INLINE_REPLY_BTN_CLASS = "deep-profile-inline-reply-btn";
const INLINE_CONTAINER_CLASS = "deep-profile-inline-controls";

const INLINE_TONE_CLASS = "deep-profile-inline-tone-select";

const extractReplyContext = (targetInput: EditableTarget): ReplyContext => {
  let targetUser = "User";
  let answerContent = "";
  const conversation: ConversationItem[] = [];

  // Find the tweet being replied to
  const cell = targetInput.closest("[data-testid='cellInnerDiv']");
  if (cell && cell.previousElementSibling) {
    const targetTweet =
      cell.previousElementSibling.querySelector(TWEET_SELECTOR);
    if (targetTweet) {
      targetUser =
        targetTweet.querySelector(USER_NAME_SELECTOR)?.textContent || "User";
      answerContent =
        targetTweet.querySelector(TWEET_TEXT_SELECTOR)?.textContent || "";
    }
  } else {
    // Maybe in a modal
    const modal = targetInput.closest("[aria-modal='true']");
    if (modal) {
      // In a modal, usually the tweet being replied to is present
      // Look for the last tweet structure before the input
      // This is heuristic and might need refinement
      const tweets = Array.from(modal.querySelectorAll(TWEET_SELECTOR));
      // The last tweet is likely the one being replied to? Or the first?
      // Usually it's the one displayed prominently
      if (tweets.length > 0) {
        const targetTweet = tweets[0]; // Assume first tweet in modal is target
        targetUser =
          targetTweet.querySelector(USER_NAME_SELECTOR)?.textContent || "User";
        answerContent =
          targetTweet.querySelector(TWEET_TEXT_SELECTOR)?.textContent || "";
      }
    }
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
    pageTitle: "Twitter / X",
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
      primary: defaultTheme?.colors.primary || "#1d9bf0", // Twitter Blue
      secondary: defaultTheme?.colors.secondary || "#1d9bf0",
      text: defaultTheme?.colors.text || "#0f1419",
      textSecondary: defaultTheme?.colors.textSecondary || "#536471",
      border: defaultTheme?.colors.border || "#cfd9de",
      surface: defaultTheme?.colors.surface || "#ffffff",
      background: defaultTheme?.colors.background || "#ffffff",
      accent: defaultTheme?.colors.accent || "#1d9bf0",
      primaryText: defaultTheme?.colors.primaryText || "#ffffff",
      success: defaultTheme?.colors.success || "#00ba7c",
      error: defaultTheme?.colors.error || "#f4212e",
      fontFamily:
        defaultTheme?.typography.fontFamily || "TwitterChirp, sans-serif",
      shadow: defaultTheme?.shadows.large || "0 8px 24px rgba(0,0,0,0.15)",
    };
  });
  const [logoSrc, setLogoSrc] = useState("");
  const [ballPos, setBallPos] = useState(() => ({
    left: Math.max(window.innerWidth - FLOATING_BALL_SIZE - 24, 16),
    top: Math.max(window.innerHeight - 160, 16),
  }));
  const activeTargetRef = useRef<EditableTarget | null>(null);

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
    const twitterConfig = config.platformConfigs.twitter;
    await ConfigService.saveConfig({
      ...config,
      platformConfigs: {
        ...config.platformConfigs,
        twitter: {
          ...twitterConfig,
          settings: {
            ...(twitterConfig.settings || {}),
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
      const twitterConfig = config.platformConfigs.twitter;
      const assistantSettings = twitterConfig.settings?.replyAssistant || {
        tone: "Objective",
        replyLength: "medium",
      };

      setSettings({
        tone: assistantSettings.tone || "Objective",
        replyLength: assistantSettings.replyLength || "medium",
      });

      setSiteSettings({
        platformEnabled: config.enabledPlatforms?.twitter ?? true,
        analysisButtonEnabled: twitterConfig.analysisButtonEnabled ?? true,
        commentAnalysisEnabled: false,
        replyAssistantEnabled: twitterConfig.replyAssistantEnabled ?? true,
        analysisMode: config.platformAnalysisModes?.twitter ?? "balanced",
        analyzeLimit: config.analyzeLimit || 15,
      });

      setEnabled(
        (config.globalEnabled ?? true) &&
          (twitterConfig.replyAssistantEnabled ?? true),
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
        enabledPlatforms: { ...cfg.enabledPlatforms, twitter: checked },
      }));
      setSiteSettings((prev) => ({ ...prev, platformEnabled: checked }));
    }
    if (key === "replyAssistantEnabled") {
      const config = await ConfigService.getConfig();
      const twitterConfig = config.platformConfigs.twitter;
      await ConfigService.saveConfig({
        ...config,
        platformConfigs: {
          ...config.platformConfigs,
          twitter: { ...twitterConfig, replyAssistantEnabled: checked },
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
        platform: "twitter",
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

  const findToolbarForInput = (
    targetInput: EditableTarget,
  ): HTMLElement | null => {
    const inputRoot = targetInput.closest(
      "[data-testid^='tweetTextarea_'], [aria-modal='true'], form",
    );
    if (!inputRoot) return null;

    // 1) Form composer
    const form =
      inputRoot.closest("form") ||
      inputRoot.querySelector("form") ||
      inputRoot.parentElement?.closest("form");
    if (form) {
      const formToolbar = form.querySelector(TOOLBAR_SELECTOR);
      if (formToolbar instanceof HTMLElement) return formToolbar;
    }

    // 2) Walk up ancestors and find nearest subtree containing toolbar
    let cursor: Element | null = inputRoot;
    for (let depth = 0; depth < 12 && cursor; depth += 1) {
      const toolbar = cursor.querySelector(TOOLBAR_SELECTOR);
      if (toolbar instanceof HTMLElement) return toolbar;
      cursor = cursor.parentElement;
    }

    // 3) Modal fallback
    const modalToolbar = targetInput
      .closest("[aria-modal='true']")
      ?.querySelector(TOOLBAR_SELECTOR);
    if (modalToolbar instanceof HTMLElement) return modalToolbar;

    return null;
  };

  const ensureInlineControls = (targetInput: EditableTarget) => {
    const toolbar = findToolbarForInput(targetInput);
    if (!toolbar) return;
    if (toolbar.querySelector(`.${INLINE_CONTAINER_CLASS}`)) return;

    const controlContainer = document.createElement("div");
    controlContainer.className = INLINE_CONTAINER_CLASS;
    controlContainer.style.display = "inline-flex";
    controlContainer.style.alignItems = "center";
    controlContainer.style.marginLeft = "8px";
    controlContainer.style.gap = "8px";

    // Tone Select
    const toneSelect = document.createElement("select");
    toneSelect.className = INLINE_TONE_CLASS;
    toneSelect.style.cssText = `
        height: 24px;
        padding: 0 4px;
        border-radius: 8px;
        border: 1px solid ${themeState.isDark ? "#474a4e" : "#ccc"};
        background: ${themeState.isDark ? "#272729" : "#ffffff"};
        color: ${themeState.text};
        font-size: 11px;
        outline: none;
    `;
    toneOptions.forEach((tone) => {
      const option = document.createElement("option");
      option.value = tone;
      option.textContent = tone;
      toneSelect.appendChild(option);
    });
    toneSelect.value = settings.tone;
    toneSelect.onclick = (e) => e.stopPropagation();
    toneSelect.onchange = async (e) => {
      e.stopPropagation();
      await onToneChange((e.target as HTMLSelectElement).value);
    };

    const aiBtn = document.createElement("button");
    aiBtn.textContent = "AI";
    aiBtn.className = INLINE_REPLY_BTN_CLASS;
    aiBtn.style.cssText = `
        height: 24px;
        padding: 0 10px;
        border-radius: 99px;
        background: ${themeState.primary}22;
        color: ${themeState.primary};
        font-weight: 700;
        font-size: 12px;
        border: 1px solid ${themeState.primary}44;
        cursor: pointer;
      `;

    aiBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      aiBtn.disabled = true;
      const originalText = aiBtn.textContent;
      aiBtn.textContent = "Generating...";
      activeTargetRef.current = targetInput;
      try {
        await generateReply(targetInput);
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = originalText || "AI";
      }
    };

    controlContainer.appendChild(toneSelect);
    controlContainer.appendChild(aiBtn);
    const replyActionGroup = toolbar.querySelector(
      "[data-testid='tweetButton']",
    );
    if (replyActionGroup?.parentElement) {
      replyActionGroup.parentElement.insertBefore(
        controlContainer,
        replyActionGroup,
      );
      return;
    }

    const inlineActionGroup = toolbar.querySelector(
      "[data-testid='tweetButtonInline']",
    );
    if (inlineActionGroup?.parentElement) {
      inlineActionGroup.parentElement.insertBefore(
        controlContainer,
        inlineActionGroup,
      );
      return;
    }

    toolbar.appendChild(controlContainer);
  };

  useEffect(() => {
    if (!enabled) return;

    const getTwitterInputs = (): NodeListOf<Element> => {
      const direct = document.querySelectorAll(INPUT_SELECTOR);
      if (direct.length > 0) return direct;
      return document.querySelectorAll(
        "[data-testid^='tweetTextarea_'], div[role='textbox'][contenteditable='true']",
      );
    };

    const scan = () => {
      const inputs = getTwitterInputs();
      inputs.forEach((input) => {
        // The input itself is a div with contenteditable
        ensureInlineControls(input as EditableTarget);
      });
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (
        !target.matches(
          "[data-testid^='tweetTextarea_'], div[role='textbox'][contenteditable='true']",
        )
      ) {
        return;
      }
      ensureInlineControls(target as EditableTarget);
    };

    scan();
    document.addEventListener("focusin", onFocusIn, true);
    const interval = setInterval(scan, 1500);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      clearInterval(interval);
    };
  }, [enabled, themeState]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as HTMLElement;
      const root = document.getElementById("deep-profile-twitter-reply-root");
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
  const id = "deep-profile-twitter-reply-root";
  if (document.getElementById(id)) return;
  const root = document.createElement("div");
  root.id = id;
  document.body.appendChild(root);
  createRoot(root).render(<FloatingReplyAssistant />);
};

mount();

export default function TwitterReplyAssistant() {
  return null;
}

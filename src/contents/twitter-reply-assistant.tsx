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
import {
  EN_TONE_OPTIONS,
  INLINE_CONTAINER_CLASS,
  INLINE_REPLY_BTN_CLASS,
  INLINE_TONE_CLASS,
} from "./reply-assistant-shared/tone-options";
import type {
  EditableTarget,
  ReplyContext,
} from "./reply-assistant-shared/types";
import { setEditableText as setSharedEditableText } from "./reply-assistant-shared/editable";
import { DEFAULT_REPLY_SETTINGS_EN } from "./reply-assistant-shared/defaults";
import { useReplyAssistantConfig } from "./reply-assistant-shared/useReplyAssistantConfig";
import { useReplyGeneration } from "./reply-assistant-shared/useReplyGeneration";
import { useFloatingBallState } from "./reply-assistant-shared/useFloatingBallState";
import { createInlineControls } from "./reply-assistant-shared/createInlineControls";

export const config: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://x.com/*"],
};

const BALL_POSITION_STORAGE_KEY = "deep_profile_twitter_ball_pos";

// Twitter/X specific selectors
const INPUT_SELECTOR = "[data-testid^='tweetTextarea_']";
const TWEET_SELECTOR = "[data-testid='tweet']";
const USER_NAME_SELECTOR = "[data-testid='User-Name']";
const TWEET_TEXT_SELECTOR = "[data-testid='tweetText']";
const TOOLBAR_SELECTOR = "[data-testid='toolBar']";

const toneOptions = EN_TONE_OPTIONS;

const extractReplyContext = (targetInput: EditableTarget): ReplyContext => {
  let targetUser = "User";
  let answerContent = "";
  const conversation: ReplyContext["conversation"] = [];

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
    platform: "twitter",
    defaultSettings: DEFAULT_REPLY_SETTINGS_EN,
    themeFallback: {
      primary: "#1d9bf0",
      secondary: "#1d9bf0",
      text: "#0f1419",
      textSecondary: "#536471",
      border: "#cfd9de",
      surface: "#ffffff",
      background: "#ffffff",
      accent: "#1d9bf0",
      primaryText: "#ffffff",
      success: "#00ba7c",
      error: "#f4212e",
      fontFamily: "TwitterChirp, sans-serif",
      shadow: "0 8px 24px rgba(0,0,0,0.15)",
    },
  });
  const [logoSrc, setLogoSrc] = useState("");
  const activeTargetRef = useRef<EditableTarget | null>(null);

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
  const { loading, error, reply, generateReply, onCopy, onApply } =
    useReplyGeneration({
      platform: "twitter",
      settings,
      activeTargetRef,
      setEditableText,
      extractContext: extractReplyContext,
    });

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
    const controls = createInlineControls({
      toneOptions,
      tone: settings.tone,
      classes: {
        container: INLINE_CONTAINER_CLASS,
        toneSelect: INLINE_TONE_CLASS,
        replyBtn: INLINE_REPLY_BTN_CLASS,
      },
      style: {
        container:
          "display: inline-flex; align-items: center; margin-left: 8px; gap: 8px;",
        toneSelect: `
          height: 24px;
          padding: 0 4px;
          border-radius: 8px;
          border: 1px solid ${themeState.isDark ? "#474a4e" : "#ccc"};
          background: ${themeState.isDark ? "#272729" : "#ffffff"};
          color: ${themeState.text};
          font-size: 11px;
          outline: none;
        `,
        replyBtn: `
          height: 24px;
          padding: 0 10px;
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
      onGenerate: async () => {
        activeTargetRef.current = targetInput;
        await generateReply(targetInput);
      },
      stopPropagationOnSelect: true,
    });
    const controlContainer = controls.container;
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

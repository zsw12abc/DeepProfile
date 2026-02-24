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
  colorWithAlpha,
} from "./reply-assistant-ui/utils";
import {
  INLINE_CONTAINER_CLASS,
  INLINE_LENGTH_CLASS,
  INLINE_REPLY_BTN_CLASS,
  INLINE_TONE_CLASS,
  ZH_TONE_OPTIONS,
} from "./reply-assistant-shared/tone-options";
import type {
  EditableTarget,
  ReplyContext,
} from "./reply-assistant-shared/types";
import {
  isContentEditableElement,
  isVisible,
  setEditableText as setSharedEditableText,
} from "./reply-assistant-shared/editable";

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"],
};

const BALL_POSITION_STORAGE_KEY = "deep_profile_zhihu_ball_pos";

const toneOptions = ZH_TONE_OPTIONS;
const REPLY_HINT_KEYS = ["回复", "reply", "评论", "comment"];
const EDITOR_ROOT_SELECTORS = [
  ".CommentEditorV2",
  ".CommentEditor",
  ".NestCommentEditor",
  ".InputLike",
  ".DraftEditor-root",
  ".CommentsV2-footer",
  ".Comments-container",
  ".Modal-content",
].join(", ");

const getElementHintText = (el: Element): string => {
  const candidates = [
    (el as HTMLTextAreaElement).placeholder || "",
    el.getAttribute("placeholder") || "",
    el.getAttribute("aria-label") || "",
    el.getAttribute("data-placeholder") || "",
    el.getAttribute("title") || "",
    (el as HTMLElement).className || "",
  ];
  return candidates.join(" ").toLowerCase();
};

const isLikelyReplyInput = (el: Element): el is EditableTarget => {
  if (!isVisible(el)) return false;
  const isTextarea = el instanceof HTMLTextAreaElement;
  const isEditable = isTextarea || isContentEditableElement(el);
  if (!isEditable) return false;

  const hint = getElementHintText(el);
  if (REPLY_HINT_KEYS.some((key) => hint.includes(key))) return true;

  return (
    hint.includes("commenteditor") ||
    hint.includes("inputlike") ||
    hint.includes("reply")
  );
};

const hasNearbyPublishButton = (el: Element): boolean => {
  let current: Element | null = el;
  for (let i = 0; i < 8 && current; i += 1) {
    const buttons = Array.from(current.querySelectorAll("button"));
    const found = buttons.some((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return false;
      if (!isVisible(btn)) return false;
      const text = (btn.textContent || "").trim();
      return text === "发布" || text === "Publish";
    });
    if (found) return true;
    current = current.parentElement;
  }
  return false;
};

const findEditableInEditorRoot = (root: Element): EditableTarget | null => {
  const directEditableCandidates = Array.from(
    root.querySelectorAll(
      "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
    ),
  );

  const preferred = directEditableCandidates.find((node) => {
    if (!isVisible(node)) return false;
    return isLikelyReplyInput(node) || hasNearbyPublishButton(node);
  });
  if (preferred) return preferred as EditableTarget;

  const fallback = directEditableCandidates.find((node) => {
    if (!isVisible(node)) return false;
    return (
      node instanceof HTMLTextAreaElement || isContentEditableElement(node)
    );
  });

  if (fallback) {
    return fallback as EditableTarget;
  }

  const roleTextboxCandidates = Array.from(
    root.querySelectorAll("[role='textbox']"),
  );
  for (const roleNode of roleTextboxCandidates) {
    if (!isVisible(roleNode)) continue;
    const nestedEditable = roleNode.querySelector(
      "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
    );
    if (nestedEditable && isVisible(nestedEditable)) {
      return nestedEditable as EditableTarget;
    }
  }

  return null;
};

const findEditorRoot = (node: Element): Element | null => {
  const direct = node.closest(EDITOR_ROOT_SELECTORS);
  if (direct) return direct;

  let current: Element | null = node;
  for (let i = 0; i < 9 && current; i += 1) {
    const hasPublish = hasNearbyPublishButton(current);
    if (hasPublish) return current;
    current = current.parentElement;
  }
  return null;
};

const isDeepProfileInlineControl = (el: Element): boolean => {
  return (
    el.classList.contains(INLINE_REPLY_BTN_CLASS) ||
    el.classList.contains(INLINE_TONE_CLASS) ||
    el.classList.contains(INLINE_LENGTH_CLASS) ||
    !!el.closest(`.${INLINE_REPLY_BTN_CLASS}`) ||
    !!el.closest(`.${INLINE_TONE_CLASS}`) ||
    !!el.closest(`.${INLINE_LENGTH_CLASS}`) ||
    !!el.closest("#deep-profile-reply-assistant-root")
  );
};

const parseTargetFromPlaceholder = (placeholder?: string): string | null => {
  if (!placeholder) return null;
  const match = placeholder.match(/(?:回复|Reply)\s*([^：:]+)[:：]?/i);
  return match?.[1]?.trim() || null;
};

const setEditableText = (target: EditableTarget, value: string) =>
  setSharedEditableText(target, value, { resolveNested: true });

const extractReplyContext = (
  targetInput: EditableTarget,
): ReplyContext | null => {
  if (!targetInput || !targetInput.isConnected) return null;

  const rootItem =
    targetInput.closest("[data-id]") ||
    targetInput.closest(".CommentItemV2") ||
    targetInput.closest("li") ||
    targetInput.parentElement;

  const targetAuthorEl =
    rootItem?.querySelector(".UserLink-link") ||
    rootItem?.querySelector("a[href*='/people/']") ||
    rootItem?.querySelector(".CommentItemV2-meta a");

  const targetFromPlaceholder = parseTargetFromPlaceholder(
    (targetInput as HTMLTextAreaElement).placeholder ||
      targetInput.getAttribute("placeholder") ||
      targetInput.getAttribute("data-placeholder") ||
      "",
  );

  const targetUser =
    targetFromPlaceholder || targetAuthorEl?.textContent?.trim() || "对方用户";

  const titleEl = document.querySelector(".QuestionHeader-title");
  const pageTitle = titleEl?.textContent?.trim() || document.title;

  const answerEl =
    targetInput.closest(".ContentItem")?.querySelector(".RichContent-inner") ||
    document.querySelector(".RichContent-inner") ||
    document.querySelector(".Post-RichText");
  const answerContent = answerEl?.textContent?.trim().slice(0, 1600);

  const conversationRoot =
    targetInput.closest(".Comments-container") ||
    targetInput.closest(".Modal-content") ||
    targetInput.closest(".CommentListV2") ||
    document.querySelector(".Comments-container") ||
    document.body;

  const nodes = Array.from(
    conversationRoot.querySelectorAll(
      ".CommentItemV2, .NestComment, [data-id], li",
    ),
  );

  const conversation: ReplyContext["conversation"] = [];
  for (const node of nodes) {
    const contentEl =
      node.querySelector(".CommentContent") ||
      node.querySelector(".RichText") ||
      node.querySelector(".ztext");
    const content = contentEl?.textContent?.trim();
    if (!content) continue;

    const authorEl =
      node.querySelector(".UserLink-link") ||
      node.querySelector("a[href*='/people/']") ||
      node.querySelector(".CommentItemV2-meta a");
    const author = authorEl?.textContent?.trim() || "匿名用户";

    conversation.push({
      author,
      content: content.slice(0, 300),
      isTarget: author === targetUser,
    });
  }

  return {
    targetUser,
    pageTitle,
    answerContent,
    conversation: conversation.slice(-10),
    targetInput,
  };
};

const FloatingReplyAssistant = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState<ReplyAssistantSettings>({
    tone: "客观",
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
      primary: defaultTheme?.colors.primary || "#0f7cf2",
      secondary: defaultTheme?.colors.secondary || "#22c55e",
      text: defaultTheme?.colors.text || "#1e2a3a",
      textSecondary: defaultTheme?.colors.textSecondary || "#475569",
      border: defaultTheme?.colors.border || "rgba(54, 132, 231, 0.44)",
      surface: defaultTheme?.colors.surface || "rgba(247,252,255,0.95)",
      background: defaultTheme?.colors.background || "#e7f6ff",
      accent: defaultTheme?.colors.accent || "#38bdf8",
      primaryText: defaultTheme?.colors.primaryText || "#ffffff",
      success: defaultTheme?.colors.success || "#16a34a",
      error: defaultTheme?.colors.error || "#ef4444",
      fontFamily:
        defaultTheme?.typography.fontFamily ||
        "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif",
      shadow:
        defaultTheme?.shadows.large || "0 24px 52px rgba(15, 23, 42, 0.26)",
    };
  });
  const [logoSrc, setLogoSrc] = useState("");
  const [ballPos, setBallPos] = useState(() => ({
    left: Math.max(window.innerWidth - FLOATING_BALL_SIZE - 24, 16),
    top: Math.max(window.innerHeight - 160, 16),
  }));

  const activeTargetRef = useRef<EditableTarget | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

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
    const zhihuConfig = config.platformConfigs.zhihu;
    await ConfigService.saveConfig({
      ...config,
      platformConfigs: {
        ...config.platformConfigs,
        zhihu: {
          ...zhihuConfig,
          settings: {
            ...(zhihuConfig.settings || {}),
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
      const zhihuConfig = config.platformConfigs.zhihu;
      const assistantSettings = zhihuConfig.settings?.replyAssistant ||
        DEFAULT_CONFIG.platformConfigs.zhihu.settings?.replyAssistant || {
          tone: "客观",
          replyLength: "medium",
        };

      setSettings({
        tone: assistantSettings.tone || "客观",
        replyLength: assistantSettings.replyLength || "medium",
      });

      setSiteSettings({
        platformEnabled:
          config.enabledPlatforms?.zhihu ??
          DEFAULT_CONFIG.enabledPlatforms.zhihu,
        analysisButtonEnabled:
          zhihuConfig.analysisButtonEnabled ??
          DEFAULT_CONFIG.platformConfigs.zhihu.analysisButtonEnabled ??
          true,
        commentAnalysisEnabled:
          zhihuConfig.commentAnalysisEnabled ??
          DEFAULT_CONFIG.platformConfigs.zhihu.commentAnalysisEnabled ??
          true,
        replyAssistantEnabled:
          zhihuConfig.replyAssistantEnabled ??
          DEFAULT_CONFIG.platformConfigs.zhihu.replyAssistantEnabled ??
          true,
        analysisMode:
          config.platformAnalysisModes?.zhihu ??
          DEFAULT_CONFIG.platformAnalysisModes.zhihu,
        analyzeLimit: config.analyzeLimit || DEFAULT_CONFIG.analyzeLimit,
      });

      setEnabled(
        (config.globalEnabled ?? DEFAULT_CONFIG.globalEnabled) &&
          (config.enabledPlatforms?.zhihu ??
            DEFAULT_CONFIG.enabledPlatforms.zhihu) &&
          (zhihuConfig.replyAssistantEnabled ??
            DEFAULT_CONFIG.platformConfigs.zhihu.replyAssistantEnabled ??
            true),
      );

      const activeTheme =
        config.themes?.[config.themeId] ||
        DEFAULT_CONFIG.themes[config.themeId] ||
        DEFAULT_CONFIG.themes[DEFAULT_CONFIG.themeId];
      setThemeState({
        isDark: isDarkThemeId(config.themeId),
        primary: activeTheme?.colors.primary || "#0f7cf2",
        secondary: activeTheme?.colors.secondary || "#22c55e",
        text: activeTheme?.colors.text || "#1e2a3a",
        textSecondary: activeTheme?.colors.textSecondary || "#475569",
        border: activeTheme?.colors.border || "rgba(54, 132, 231, 0.44)",
        surface: activeTheme?.colors.surface || "rgba(247,252,255,0.95)",
        background: activeTheme?.colors.background || "#e7f6ff",
        accent: activeTheme?.colors.accent || "#38bdf8",
        primaryText: activeTheme?.colors.primaryText || "#ffffff",
        success: activeTheme?.colors.success || "#16a34a",
        error: activeTheme?.colors.error || "#ef4444",
        fontFamily:
          activeTheme?.typography.fontFamily ||
          "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif",
        shadow:
          activeTheme?.shadows.large || "0 24px 52px rgba(15, 23, 42, 0.26)",
      });
    };

    loadSettings();

    const onStorageChange = async (changes: any, areaName: string) => {
      if (areaName === "local" && changes.deep_profile_config) {
        await loadSettings();
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (isDeepProfileInlineControl(target)) return;
      if (isLikelyReplyInput(target) || hasNearbyPublishButton(target)) {
        const root = findEditorRoot(target);
        const editable =
          (root && findEditableInEditorRoot(root)) ||
          (target as EditableTarget);
        activeTargetRef.current = editable;
      }
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (isDeepProfileInlineControl(target)) return;
      const editable = target.closest(
        "textarea, [contenteditable], [role='textbox']",
      );
      const candidate = (editable || target) as Element;
      if (isLikelyReplyInput(candidate) || hasNearbyPublishButton(candidate)) {
        const root = findEditorRoot(candidate);
        const editableTarget =
          (root && findEditableInEditorRoot(root)) ||
          (candidate as EditableTarget);
        activeTargetRef.current = editableTarget;
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    const loadBallPos = async () => {
      try {
        const result = await chrome.storage.local.get(
          BALL_POSITION_STORAGE_KEY,
        );
        const stored = result?.[BALL_POSITION_STORAGE_KEY] as
          | { left?: number; top?: number }
          | undefined;
        if (
          stored &&
          typeof stored.left === "number" &&
          typeof stored.top === "number"
        ) {
          setBallPos(clampBallPos({ left: stored.left, top: stored.top }));
        }
      } catch {
        // Ignore storage read errors.
      }
    };

    loadBallPos();

    const onResize = () => {
      setBallPos((prev) => clampBallPos(prev));
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const generateReplyForTarget = async (target: EditableTarget | null) => {
    setError(null);
    setLoading(true);

    try {
      if (!target || !target.isConnected) {
        throw new Error("未检测到可回复输入框，请先点击目标评论输入框。");
      }

      const context = extractReplyContext(target);
      if (!context) {
        throw new Error("未能抓取回复上下文，请重新点击输入框后再试。");
      }

      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_REPLY",
        platform: "zhihu",
        tone: settings.tone,
        replyLength: settings.replyLength,
        context: {
          targetUser: context.targetUser,
          pageTitle: context.pageTitle,
          answerContent: context.answerContent,
          conversation: context.conversation,
        },
      });

      if (!response?.success || !response?.data?.reply) {
        throw new Error(response?.error || "生成失败，请检查模型配置后重试。");
      }

      const generated = response.data.reply.trim();
      setReply(generated);
      setEditableText(context.targetInput, generated);
    } catch (e: any) {
      setError(e?.message || "生成失败，请稍后重试。");
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

  const onToneChange = async (tone: string) => {
    const next = { ...settings, tone };
    setSettings(next);
    await saveSettings(next);
  };

  const onReplyLengthChange = async (
    replyLength: ReplyAssistantSettings["replyLength"],
  ) => {
    const next = { ...settings, replyLength };
    setSettings(next);
    await saveSettings(next);
  };

  const onSiteToggleChange = async (
    key:
      | "platformEnabled"
      | "analysisButtonEnabled"
      | "commentAnalysisEnabled"
      | "replyAssistantEnabled",
    checked: boolean,
  ) => {
    const next = { ...siteSettings, [key]: checked };
    setSiteSettings(next);
    if (key === "replyAssistantEnabled" || key === "platformEnabled") {
      const globalConfig = await ConfigService.getConfig();
      setEnabled(
        (globalConfig.globalEnabled ?? DEFAULT_CONFIG.globalEnabled) &&
          (key === "platformEnabled" ? checked : next.platformEnabled) &&
          (key === "replyAssistantEnabled"
            ? checked
            : next.replyAssistantEnabled),
      );
    }

    await updateConfig((config) => {
      const zhihuConfig = config.platformConfigs?.zhihu || {};
      const merged = {
        ...config,
        enabledPlatforms: {
          ...(config.enabledPlatforms || {}),
          zhihu:
            key === "platformEnabled"
              ? checked
              : config.enabledPlatforms?.zhihu ?? true,
        },
        platformConfigs: {
          ...(config.platformConfigs || {}),
          zhihu: {
            ...zhihuConfig,
            analysisButtonEnabled:
              key === "analysisButtonEnabled"
                ? checked
                : zhihuConfig.analysisButtonEnabled ?? true,
            commentAnalysisEnabled:
              key === "commentAnalysisEnabled"
                ? checked
                : zhihuConfig.commentAnalysisEnabled ?? true,
            replyAssistantEnabled:
              key === "replyAssistantEnabled"
                ? checked
                : zhihuConfig.replyAssistantEnabled ?? true,
          },
        },
      };

      return merged;
    });
  };

  const onAnalysisModeChange = async (mode: AnalysisMode) => {
    setSiteSettings((prev) => ({ ...prev, analysisMode: mode }));
    await updateConfig((config) => ({
      ...config,
      platformAnalysisModes: {
        ...(config.platformAnalysisModes || {}),
        zhihu: mode,
      },
    }));
  };

  const onAnalyzeLimitChange = async (limit: number) => {
    setSiteSettings((prev) => ({ ...prev, analyzeLimit: limit }));
    await updateConfig((config) => ({
      ...config,
      analyzeLimit: limit,
    }));
  };

  const canApply = useMemo(() => !!reply && !!activeTargetRef.current, [reply]);
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

  const onBallPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      dragging: false,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: ballPos.left,
      startTop: ballPos.top,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        state.dragging = true;
      }

      const left = Math.min(
        Math.max(FLOATING_BALL_MARGIN, state.startLeft + dx),
        window.innerWidth - FLOATING_BALL_SIZE - FLOATING_BALL_MARGIN,
      );
      const top = Math.min(
        Math.max(FLOATING_BALL_MARGIN, state.startTop + dy),
        window.innerHeight - FLOATING_BALL_SIZE - FLOATING_BALL_MARGIN,
      );
      setBallPos({ left, top });
    };

    const handleUp = async (upEvent: PointerEvent) => {
      const state = dragStateRef.current;
      const shouldToggle = state && !state.dragging;
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      if (state?.dragging) {
        const finalPos = clampBallPos({
          left: state.startLeft + (upEvent.clientX - state.startX),
          top: state.startTop + (upEvent.clientY - state.startY),
        });
        setBallPos(finalPos);
        try {
          await chrome.storage.local.set({
            [BALL_POSITION_STORAGE_KEY]: finalPos,
          });
        } catch {
          // Ignore storage write errors.
        }
      }

      if (shouldToggle) {
        setOpen((v) => !v);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as HTMLElement;
      // 检查点击是否在面板内部
      // 面板是直接渲染在 root 下的第二个 div (第一个是 button)，但 button 有自己的 click 处理
      // 这里的逻辑主要是防点外面关闭
      // 使用更稳健的判断：
      const root = document.getElementById("deep-profile-reply-assistant-root");
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

  const clearInlineControls = () => {
    document
      .querySelectorAll(`.${INLINE_CONTAINER_CLASS}`)
      .forEach((el) => el.remove());
  };

  const isPublishButton = (el: Element): el is HTMLButtonElement => {
    if (!(el instanceof HTMLButtonElement)) return false;
    if (!isVisible(el)) return false;
    const text = (el.textContent || "").trim();
    return text === "发布" || text === "Publish";
  };

  const ensureInlineControlsForPublishButton = (
    publishBtn: HTMLButtonElement,
  ) => {
    if (!enabled) return;
    const row = publishBtn.parentElement;
    if (!row) return;

    const editorRoot = findEditorRoot(publishBtn) || row;
    const target = findEditableInEditorRoot(editorRoot);
    if (!target) return;

    let container = row.querySelector(
      `.${INLINE_CONTAINER_CLASS}`,
    ) as HTMLDivElement | null;
    if (!container) {
      container = document.createElement("div");
      container.className = INLINE_CONTAINER_CLASS;
      container.style.display = "inline-flex";
      container.style.alignItems = "center";
      container.style.marginRight = "10px";
      row.insertBefore(container, publishBtn);
    }

    let toneSelect = container.querySelector(
      `.${INLINE_TONE_CLASS}`,
    ) as HTMLSelectElement | null;
    let inlineBtn = container.querySelector(
      `.${INLINE_REPLY_BTN_CLASS}`,
    ) as HTMLButtonElement | null;

    if (!toneSelect) {
      toneSelect = document.createElement("select");
      toneSelect.className = INLINE_TONE_CLASS;
      toneOptions.forEach((tone) => {
        const option = document.createElement("option");
        option.value = tone;
        option.textContent = tone;
        toneSelect!.appendChild(option);
      });
      container.appendChild(toneSelect);
    }

    if (!inlineBtn) {
      inlineBtn = document.createElement("button");
      inlineBtn.type = "button";
      inlineBtn.className = INLINE_REPLY_BTN_CLASS;
      container.appendChild(inlineBtn);
    }

    toneSelect.disabled = loading;
    toneSelect.value = settings.tone;
    toneSelect.style.height = "36px";
    toneSelect.style.minWidth = "102px";
    toneSelect.style.marginRight = "8px";
    toneSelect.style.padding = "0 10px";
    toneSelect.style.borderRadius = "8px";
    toneSelect.style.border = "1px solid #d0d7e2";
    toneSelect.style.background = "#f5f7fa";
    toneSelect.style.color = "#34495e";
    toneSelect.style.fontSize = "14px";
    toneSelect.style.fontWeight = "600";

    inlineBtn.textContent = loading ? "生成中..." : "AI回复";
    inlineBtn.disabled = loading;
    inlineBtn.style.height = "36px";
    inlineBtn.style.minWidth = "88px";
    inlineBtn.style.padding = "0 14px";
    inlineBtn.style.borderRadius = "8px";
    inlineBtn.style.border = "1px solid #95c5ff";
    inlineBtn.style.background = "#e8f3ff";
    inlineBtn.style.color = "#1677ff";
    inlineBtn.style.fontSize = "15px";
    inlineBtn.style.fontWeight = "700";
    inlineBtn.style.cursor = loading ? "not-allowed" : "pointer";

    toneSelect.onmousedown = (event) => event.stopPropagation();
    toneSelect.onclick = (event) => event.stopPropagation();
    toneSelect.onchange = async (event) => {
      event.stopPropagation();
      const value = (event.target as HTMLSelectElement).value;
      await onToneChange(value);
      activeTargetRef.current = target;
    };

    inlineBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const latestTarget = findEditableInEditorRoot(editorRoot) || target;
      activeTargetRef.current = latestTarget;
      if (toneSelect && toneSelect.value !== settings.tone) {
        await onToneChange(toneSelect.value);
      }
      await generateReplyForTarget(latestTarget);
    };
  };

  useEffect(() => {
    if (!enabled) {
      clearInlineControls();
      return;
    }
    const scan = () => {
      const publishButtons = Array.from(document.querySelectorAll("button"));
      publishButtons.forEach((node) => {
        if (isPublishButton(node)) {
          ensureInlineControlsForPublishButton(node);
        }
      });

      document.querySelectorAll(`.${INLINE_CONTAINER_CLASS}`).forEach((el) => {
        const parent = el.parentElement;
        if (!parent) return el.remove();
        const hasPublish = Array.from(parent.querySelectorAll("button")).some(
          (btn) => isPublishButton(btn),
        );
        if (!hasPublish) {
          el.remove();
        }
      });
    };

    scan();

    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        scan();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, loading, settings.tone, settings.replyLength]);

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
  const panelLeft = panelPos.left;
  const panelTop = panelPos.top;
  if (!enabled) return null;

  return (
    <>
      <style>{`
        .dp-select-focus:focus {
          border-color: ${themeState.primary} !important;
          box-shadow: 0 0 0 3px ${colorWithAlpha(themeState.primary, 0.2)} !important;
          outline: none;
        }
        .dp-btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .dp-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
      <FloatingBall
        ballPos={ballPos}
        themeState={themeState}
        logoSrc={logoSrc || logoCandidates[0]}
        onPointerDown={onBallPointerDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = `0 12px 24px ${colorWithAlpha(themeState.primary, 0.5)}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = `0 8px 20px ${colorWithAlpha(themeState.primary, 0.4)}`;
        }}
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
          panelPos={{ left: panelLeft, top: panelTop }}
          panelWidth={panelWidth}
          themeState={themeState}
          logoSrc={logoSrc || logoCandidates[0]}
          siteSettings={siteSettings}
          settings={settings}
          toneOptions={toneOptions}
          reply={reply}
          error={error}
          loading={loading}
          canApply={!!canApply}
          onSiteToggleChange={onSiteToggleChange as any}
          onAnalysisModeChange={onAnalysisModeChange}
          onAnalyzeLimitChange={onAnalyzeLimitChange}
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
                平台启用
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
                回复助手开关
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
                用户分析按钮
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
                评论总结按钮
                <input
                  type="checkbox"
                  checked={siteSettings.commentAnalysisEnabled}
                  onChange={(e) =>
                    onSiteToggleChange(
                      "commentAnalysisEnabled",
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
  if (document.getElementById("deep-profile-reply-assistant-root")) return;
  const root = document.createElement("div");
  root.id = "deep-profile-reply-assistant-root";
  document.body.appendChild(root);
  createRoot(root).render(<FloatingReplyAssistant />);
};

mount();

export default function ZhihuReplyAssistant() {
  return null;
}

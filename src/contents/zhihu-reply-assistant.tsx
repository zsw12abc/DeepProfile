import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigService } from "~services/ConfigService";
import {
  DEFAULT_CONFIG,
  type AnalysisMode,
  type ReplyAssistantSettings,
} from "~types";

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"],
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

const toneOptions = ["客观", "讽刺", "学术", "友好", "犀利", "简洁"];
const analysisModes: AnalysisMode[] = ["fast", "balanced", "deep"];

const REPLY_HINT_KEYS = ["回复", "reply", "评论", "comment"];
const INLINE_REPLY_BTN_CLASS = "deep-profile-inline-reply-btn";
const INLINE_TONE_CLASS = "deep-profile-inline-tone-select";
const INLINE_CONTAINER_CLASS = "deep-profile-inline-controls";
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

const isVisible = (el: Element) => {
  const htmlEl = el as HTMLElement;
  const style = window.getComputedStyle(htmlEl);
  return style.display !== "none" && style.visibility !== "hidden";
};

const isContentEditableElement = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.hasAttribute("contenteditable") ||
    el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("contenteditable") === "plaintext-only"
  );
};

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
    !!el.closest(`.${INLINE_REPLY_BTN_CLASS}`) ||
    !!el.closest(`.${INLINE_TONE_CLASS}`) ||
    !!el.closest("#deep-profile-reply-assistant-root")
  );
};

const parseTargetFromPlaceholder = (placeholder?: string): string | null => {
  if (!placeholder) return null;
  const match = placeholder.match(/(?:回复|Reply)\s*([^：:]+)[:：]?/i);
  return match?.[1]?.trim() || null;
};

const findPublishButtonInRoot = (root: Element): HTMLButtonElement | null => {
  const candidates = Array.from(root.querySelectorAll("button"));
  const publish = candidates.find((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return false;
    if (!isVisible(btn)) return false;
    const text = (btn.textContent || "").trim();
    return text === "发布" || text === "Publish";
  });
  return (publish as HTMLButtonElement) || null;
};

const setEditableText = (target: EditableTarget, value: string) => {
  let writableTarget: EditableTarget | null = null;

  if (target instanceof HTMLTextAreaElement) {
    writableTarget = target;
  } else if (
    target instanceof HTMLElement &&
    isContentEditableElement(target)
  ) {
    writableTarget = target;
  } else {
    const container = target as HTMLElement;
    const nested = container.querySelector(
      "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
    );
    if (
      nested &&
      (nested instanceof HTMLTextAreaElement ||
        isContentEditableElement(nested))
    ) {
      writableTarget = nested;
    }
  }

  if (!writableTarget) return;

  if (writableTarget instanceof HTMLTextAreaElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(writableTarget, value);
    writableTarget.dispatchEvent(new Event("input", { bubbles: true }));
    writableTarget.dispatchEvent(new Event("change", { bubbles: true }));
    writableTarget.focus();
    return;
  }

  writableTarget.focus();

  let insertedByCommand = false;
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(writableTarget);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    insertedByCommand = document.execCommand("insertText", false, value);
  } catch {
    insertedByCommand = false;
  }

  if (!insertedByCommand) {
    writableTarget.textContent = value;
  }

  try {
    writableTarget.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value,
      }),
    );
  } catch {
    // Ignore InputEvent compatibility issues.
  }

  try {
    writableTarget.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }),
    );
  } catch {
    writableTarget.dispatchEvent(new Event("input", { bubbles: true }));
  }

  writableTarget.dispatchEvent(new Event("change", { bubbles: true }));
};

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

  const conversation: ConversationItem[] = [];
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
    autoFill: false,
  });
  const [siteSettings, setSiteSettings] = useState({
    platformEnabled: true,
    analysisButtonEnabled: true,
    commentAnalysisEnabled: true,
    replyAssistantEnabled: true,
    analysisMode: "balanced" as AnalysisMode,
    analyzeLimit: 15,
  });
  const [ballPos, setBallPos] = useState(() => ({
    left: Math.max(window.innerWidth - 84, 16),
    top: Math.max(window.innerHeight - 180, 16),
  }));

  const activeTargetRef = useRef<EditableTarget | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

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
          autoFill: false,
        };

      setSettings({
        tone: assistantSettings.tone || "客观",
        autoFill: !!assistantSettings.autoFill,
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

      if (settings.autoFill) {
        setEditableText(context.targetInput, generated);
      }
    } catch (e: any) {
      setError(e?.message || "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const generateReplyForActiveTarget = async () => {
    await generateReplyForTarget(activeTargetRef.current);
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

  const onAutoFillChange = async (checked: boolean) => {
    const next = { ...settings, autoFill: checked };
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
        Math.max(8, state.startLeft + dx),
        window.innerWidth - 64,
      );
      const top = Math.min(
        Math.max(8, state.startTop + dy),
        window.innerHeight - 64,
      );
      setBallPos({ left, top });
    };

    const handleUp = () => {
      const state = dragStateRef.current;
      const shouldToggle = state && !state.dragging;
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      if (shouldToggle) {
        setOpen((v) => !v);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

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
  }, [enabled, loading, settings.tone]);

  if (!enabled) return null;

  return (
    <>
      <button
        onPointerDown={onBallPointerDown}
        title="DeepProfile 回复设置（可拖动）"
        style={{
          position: "fixed",
          left: ballPos.left,
          top: ballPos.top,
          zIndex: 2147483646,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "1px solid rgba(0, 132, 255, 0.35)",
          background:
            "radial-gradient(circle at 30% 30%, #36b0ff, #0084ff 58%, #0a66d9)",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.03em",
          boxShadow: "0 16px 34px rgba(0, 132, 255, 0.36)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        AI
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            left: Math.max(10, ballPos.left - 420),
            top: Math.max(10, ballPos.top - 12),
            width: 392,
            maxHeight: "78vh",
            overflowY: "auto",
            zIndex: 2147483646,
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(0, 132, 255, 0.25)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(241,248,255,0.97))",
            boxShadow: "0 28px 58px rgba(15, 23, 42, 0.24)",
            color: "#0f172a",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0b5ec8",
              marginBottom: 12,
            }}
          >
            知乎站点设置 · AI 回复助手
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #dbeafe",
                background: "#f8fbff",
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
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                fontSize: 12,
              }}
            >
              回复助手开关
              <input
                type="checkbox"
                checked={siteSettings.replyAssistantEnabled}
                onChange={(e) =>
                  onSiteToggleChange("replyAssistantEnabled", e.target.checked)
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
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                fontSize: 12,
              }}
            >
              用户分析按钮
              <input
                type="checkbox"
                checked={siteSettings.analysisButtonEnabled}
                onChange={(e) =>
                  onSiteToggleChange("analysisButtonEnabled", e.target.checked)
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
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                fontSize: 12,
              }}
            >
              评论总结按钮
              <input
                type="checkbox"
                checked={siteSettings.commentAnalysisEnabled}
                onChange={(e) =>
                  onSiteToggleChange("commentAnalysisEnabled", e.target.checked)
                }
              />
            </label>
          </div>

          <div
            style={{
              border: "1px solid #dbeafe",
              borderRadius: 12,
              background: "#ffffff",
              padding: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
              知乎分析模式
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {analysisModes.map((mode) => {
                const active = siteSettings.analysisMode === mode;
                const label =
                  mode === "fast"
                    ? "极速"
                    : mode === "balanced"
                      ? "平衡"
                      : "深度";
                return (
                  <button
                    key={mode}
                    onClick={() => onAnalysisModeChange(mode)}
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 8,
                      border: active
                        ? "1px solid #0f7cf2"
                        : "1px solid #cbd5e1",
                      background: active ? "#e8f3ff" : "#ffffff",
                      color: active ? "#0f5ec8" : "#334155",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
              抓取条数：{siteSettings.analyzeLimit}
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={siteSettings.analyzeLimit}
              onChange={(e) =>
                onAnalyzeLimitChange(parseInt(e.target.value, 10))
              }
              style={{ width: "100%", accentColor: "#0f7cf2" }}
            />
          </div>

          <div
            style={{
              border: "1px solid #dbeafe",
              borderRadius: 12,
              background: "#ffffff",
              padding: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
              AI 回复设置
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
              回复口气
            </div>
            <select
              value={settings.tone}
              onChange={(e) => onToneChange(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                marginBottom: 10,
                color: "#0f172a",
                background: "#ffffff",
              }}
            >
              {toneOptions.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#334155",
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={settings.autoFill}
                onChange={(e) => onAutoFillChange(e.target.checked)}
              />
              生成后自动填入当前输入框
            </label>

            <button
              onClick={generateReplyForActiveTarget}
              disabled={loading}
              style={{
                width: "100%",
                height: 34,
                border: "none",
                borderRadius: 9,
                color: "#ffffff",
                fontWeight: 700,
                background: loading ? "#94a3b8" : "#0f7cf2",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "生成中..." : "针对当前输入框生成"}
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
            当前输入框
          </div>
          <div
            style={{
              border: "1px dashed #bfdbfe",
              borderRadius: 10,
              background: "#f8fbff",
              color: activeTargetRef.current ? "#0f172a" : "#64748b",
              fontSize: 12,
              padding: "8px 10px",
            }}
          >
            {activeTargetRef.current
              ? "已捕获当前回复输入框，可直接点击 AI回复 按钮生成。"
              : "未捕获输入框，请先点一下评论输入框。"}
          </div>

          {error && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#b91c1c",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.28)",
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
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  resize: "vertical",
                  color: "#0f172a",
                  background: "#ffffff",
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
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  复制
                </button>
                <button
                  onClick={onApply}
                  disabled={!canApply}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    background: canApply ? "#0ea5e9" : "#94a3b8",
                    color: "#ffffff",
                    cursor: canApply ? "pointer" : "not-allowed",
                  }}
                >
                  填入输入框
                </button>
              </div>
            </>
          )}
        </div>
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

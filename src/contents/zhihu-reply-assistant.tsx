import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigService } from "~services/ConfigService";
import { DEFAULT_CONFIG, type ReplyAssistantSettings } from "~types";

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhihu.com/*"],
};

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
  textarea: HTMLTextAreaElement;
};

const toneOptions = ["客观", "讽刺", "学术", "友好", "犀利", "简洁"];

const isReplyTextarea = (el: Element | null): el is HTMLTextAreaElement => {
  if (!el || !(el instanceof HTMLTextAreaElement)) return false;
  const className = el.className || "";
  const placeholder = el.placeholder || "";
  return (
    className.includes("Comment") ||
    placeholder.includes("回复") ||
    placeholder.toLowerCase().includes("reply")
  );
};

const parseTargetFromPlaceholder = (placeholder?: string): string | null => {
  if (!placeholder) return null;
  const match = placeholder.match(/(?:回复|Reply)\s*([^：:]+)[:：]?/i);
  return match?.[1]?.trim() || null;
};

const extractCurrentReplyContext = (): ReplyContext | null => {
  const active = document.activeElement;
  const textarea = isReplyTextarea(active)
    ? active
    : (document.querySelector(
        "textarea.CommentEditor-input, textarea[placeholder*='回复'], textarea[placeholder*='Reply']",
      ) as HTMLTextAreaElement | null);

  if (!textarea) return null;

  const rootItem =
    textarea.closest("[data-id]") ||
    textarea.closest(".CommentItemV2") ||
    textarea.closest("li") ||
    textarea.parentElement;

  const targetAuthorEl =
    rootItem?.querySelector(".UserLink-link") ||
    rootItem?.querySelector("a[href*='/people/']") ||
    rootItem?.querySelector(".CommentItemV2-meta a");

  const targetFromPlaceholder = parseTargetFromPlaceholder(
    textarea.placeholder,
  );
  const targetUser =
    targetFromPlaceholder || targetAuthorEl?.textContent?.trim() || "对方用户";

  const titleEl = document.querySelector(".QuestionHeader-title");
  const pageTitle = titleEl?.textContent?.trim() || document.title;

  const answerEl =
    textarea.closest(".ContentItem")?.querySelector(".RichContent-inner") ||
    document.querySelector(".RichContent-inner") ||
    document.querySelector(".Post-RichText");
  const answerContent = answerEl?.textContent?.trim().slice(0, 1500);

  const conversationRoot =
    textarea.closest(".Comments-container") ||
    textarea.closest(".Modal-content") ||
    document.querySelector(".Comments-container") ||
    document.body;

  const nodes = Array.from(
    conversationRoot.querySelectorAll(
      ".CommentItemV2, [data-id], li, .NestComment",
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

  const trimmedConversation = conversation.slice(-8);

  return {
    targetUser,
    pageTitle,
    answerContent,
    conversation: trimmedConversation,
    textarea,
  };
};

const fillTextarea = (textarea: HTMLTextAreaElement, value: string) => {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  nativeSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus();
};

const FloatingReplyAssistant = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [lastContext, setLastContext] = useState<ReplyContext | null>(null);
  const [settings, setSettings] = useState<ReplyAssistantSettings>({
    tone: "客观",
    autoFill: false,
  });
  const [enabled, setEnabled] = useState(true);

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
      setEnabled(
        zhihuConfig.replyAssistantEnabled ??
          DEFAULT_CONFIG.platformConfigs.zhihu.replyAssistantEnabled ??
          true,
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

  const canFill = useMemo(() => !!lastContext?.textarea, [lastContext]);

  const generateReply = async () => {
    setError(null);
    setLoading(true);
    try {
      const context = extractCurrentReplyContext();
      if (!context) {
        throw new Error("未检测到可回复的输入框，请先点击知乎评论回复框。");
      }

      setLastContext(context);

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
        fillTextarea(context.textarea, generated);
      }
    } catch (e: any) {
      setError(e?.message || "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const onToneChange = async (tone: string) => {
    const next = { ...settings, tone };
    setSettings(next);
    await saveSettings(next);
  };

  const onAutoFillChange = async (autoFill: boolean) => {
    const next = { ...settings, autoFill };
    setSettings(next);
    await saveSettings(next);
  };

  const copyReply = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
  };

  const applyReply = () => {
    if (!reply || !lastContext?.textarea) return;
    fillTextarea(lastContext.textarea, reply);
  };

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="DeepProfile AI 回复"
        style={{
          position: "fixed",
          right: 24,
          bottom: 120,
          zIndex: 2147483646,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid rgba(0, 132, 255, 0.35)",
          background:
            "linear-gradient(145deg, rgba(0,132,255,0.95), rgba(0,184,255,0.9))",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
          boxShadow: "0 12px 28px rgba(0, 132, 255, 0.35)",
          cursor: "pointer",
        }}
      >
        AI
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 184,
            width: 360,
            zIndex: 2147483646,
            padding: 14,
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid #dbeafe",
            boxShadow: "0 20px 44px rgba(15, 23, 42, 0.22)",
            color: "#0f172a",
            fontSize: 13,
          }}
        >
          <div style={{ marginBottom: 10, fontWeight: 700 }}>
            知乎 AI 回复助手
          </div>

          <div style={{ marginBottom: 8 }}>回复口气</div>
          <select
            value={settings.tone}
            onChange={(e) => onToneChange(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              height: 32,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
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
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={settings.autoFill}
              onChange={(e) => onAutoFillChange(e.target.checked)}
            />
            生成后自动填入回复框
          </label>

          <button
            onClick={generateReply}
            disabled={loading}
            style={{
              width: "100%",
              height: 34,
              borderRadius: 9,
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#94a3b8" : "#2563eb",
            }}
          >
            {loading ? "生成中..." : "生成回复"}
          </button>

          {error && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 12 }}>
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
                  minHeight: 96,
                  marginTop: 10,
                  padding: 8,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={copyReply}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  复制
                </button>
                <button
                  onClick={applyReply}
                  disabled={!canFill}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    color: "#ffffff",
                    background: canFill ? "#0ea5e9" : "#94a3b8",
                    cursor: canFill ? "pointer" : "not-allowed",
                  }}
                >
                  填入回复框
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
  const existed = document.getElementById("deep-profile-reply-assistant-root");
  if (existed) return;

  const root = document.createElement("div");
  root.id = "deep-profile-reply-assistant-root";
  document.body.appendChild(root);

  createRoot(root).render(<FloatingReplyAssistant />);
};

mount();

export default function ZhihuReplyAssistant() {
  return null;
}

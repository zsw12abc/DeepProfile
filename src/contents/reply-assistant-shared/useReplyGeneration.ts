import { useCallback, useState, type RefObject } from "react";
import type { ReplyAssistantSettings } from "~types";
import { requestGeneratedReply } from "../reply-assistant-language-utils";
import type {
  EditableTarget,
  ReplyAssistantPlatform,
  ReplyContext,
} from "./types";

interface UseReplyGenerationOptions {
  platform: ReplyAssistantPlatform;
  settings: ReplyAssistantSettings;
  activeTargetRef: RefObject<EditableTarget | null>;
  setEditableText: (target: EditableTarget, value: string) => void;
  extractContext: (target: EditableTarget) => ReplyContext | null;
}

export const useReplyGeneration = ({
  platform,
  settings,
  activeTargetRef,
  setEditableText,
  extractContext,
}: UseReplyGenerationOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const generateReply = useCallback(
    async (target: EditableTarget | null) => {
      if (!target) return;
      setLoading(true);
      setError(null);
      try {
        const context = extractContext(target);
        if (!context) {
          throw new Error("未能抓取回复上下文，请重新点击输入框后再试。");
        }

        const generated = await requestGeneratedReply({
          platform,
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
        setError(e?.message || "Generation failed");
      } finally {
        setLoading(false);
      }
    },
    [extractContext, platform, setEditableText, settings.replyLength, settings.tone],
  );

  const onCopy = useCallback(async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
  }, [reply]);

  const onApply = useCallback(() => {
    const target = activeTargetRef.current;
    if (!target || !reply) return;
    setEditableText(target, reply);
  }, [activeTargetRef, reply, setEditableText]);

  return {
    loading,
    setLoading,
    error,
    setError,
    reply,
    setReply,
    generateReply,
    onCopy,
    onApply,
  };
};

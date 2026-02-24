import type { ReplyAssistantSettings } from "~types";
import type {
  ConversationItem,
  EditableTarget,
} from "./reply-assistant-shared/types";

export type ReplyLength = ReplyAssistantSettings["replyLength"];

export interface ReplyGenerationContext {
  targetUser: string;
  pageTitle?: string;
  answerContent?: string;
  conversation: ConversationItem[];
}

export interface GeneratedReplyPayload {
  reply: string;
  wasTrimmed: boolean;
  limit: number | null;
  countMethod: "x_weighted" | "plain";
  originalCount: number;
  finalCount: number;
}

type LanguageDetectionResult = {
  languageCode: string;
  languageName: string;
  source: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
};

const LATIN_LANGUAGE_HINTS: Record<string, string[]> = {
  es: ["que", "para", "como", "esta", "esto", "porque", "gracias"],
  fr: ["que", "pour", "avec", "est", "pas", "merci", "bonjour"],
  de: ["und", "nicht", "ist", "ich", "mit", "danke", "aber"],
  pt: ["que", "para", "com", "esta", "obrigado", "porque", "voce"],
  it: ["che", "per", "con", "non", "grazie", "ciao", "questa"],
};

const normalizeSpace = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

const readEditableText = (target: EditableTarget): string => {
  if (target instanceof HTMLTextAreaElement) {
    return normalizeSpace(target.value || "");
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return normalizeSpace(target.innerText || target.textContent || "");
  }

  if (target instanceof HTMLElement) {
    const nested = target.querySelector(
      "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
    );
    if (nested instanceof HTMLTextAreaElement) {
      return normalizeSpace(nested.value || "");
    }
    if (nested instanceof HTMLElement) {
      return normalizeSpace(nested.innerText || nested.textContent || "");
    }
  }

  return "";
};

const detectLatinLanguage = (text: string): string | null => {
  const words = (text.toLowerCase().match(/[a-zA-Z]+/g) || []).slice(0, 120);
  if (words.length < 3) return null;

  let bestCode: string | null = null;
  let bestScore = 0;

  for (const [code, hints] of Object.entries(LATIN_LANGUAGE_HINTS)) {
    const score = words.reduce(
      (acc, word) => (hints.includes(word) ? acc + 1 : acc),
      0,
    );
    if (score > bestScore) {
      bestCode = code;
      bestScore = score;
    }
  }

  if (bestScore >= 2 && bestCode) return bestCode;
  return "en";
};

const detectLanguageCode = (rawText: string): string => {
  const text = normalizeSpace(rawText);
  if (!text) return "en";

  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0900-\u097F]/.test(text)) return "hi";

  return detectLatinLanguage(text) || "en";
};

export const detectReplyLanguage = (
  target: EditableTarget,
  context: ReplyGenerationContext,
): LanguageDetectionResult => {
  const draftText = readEditableText(target);
  const fromContext = [
    context.conversation?.[0]?.content || "",
    context.answerContent || "",
    context.pageTitle || "",
  ]
    .map(normalizeSpace)
    .find((item) => item.length > 0);

  const source = draftText || fromContext || "";
  const languageCode = detectLanguageCode(source);

  return {
    languageCode,
    languageName: LANGUAGE_NAMES[languageCode] || "English",
    source,
  };
};

export const requestGeneratedReply = async (params: {
  platform: "reddit" | "quora" | "twitter" | "zhihu";
  tone: string;
  replyLength: ReplyLength;
  context: ReplyGenerationContext;
  targetInput: EditableTarget;
}): Promise<GeneratedReplyPayload> => {
  const detected = detectReplyLanguage(params.targetInput, params.context);

  const response = await chrome.runtime.sendMessage({
    type: "GENERATE_REPLY",
    platform: params.platform,
    tone: params.tone,
    replyLength: params.replyLength,
    preferredLanguage: detected.languageCode,
    preferredLanguageName: detected.languageName,
    languageDetectionSource: detected.source.slice(0, 300),
    context: params.context,
  });

  if (!response?.success || !response?.data?.reply) {
    throw new Error(response?.error || "Generation failed");
  }

  return {
    reply: String(response.data.reply).trim(),
    wasTrimmed: !!response.data.wasTrimmed,
    limit: typeof response.data.limit === "number" ? response.data.limit : null,
    countMethod:
      response.data.countMethod === "x_weighted" ? "x_weighted" : "plain",
    originalCount:
      typeof response.data.originalCount === "number"
        ? response.data.originalCount
        : 0,
    finalCount:
      typeof response.data.finalCount === "number"
        ? response.data.finalCount
        : 0,
  };
};

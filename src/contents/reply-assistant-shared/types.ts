import type { ReplyAssistantSettings } from "~types";

export type EditableTarget = HTMLTextAreaElement | HTMLElement;

export interface ConversationItem {
  author: string;
  content: string;
  isTarget?: boolean;
}

export interface ReplyContext {
  targetUser: string;
  pageTitle?: string;
  answerContent?: string;
  conversation: ConversationItem[];
  targetInput: EditableTarget;
}

export type ReplyAssistantPlatform = "reddit" | "quora" | "twitter" | "zhihu";

export interface SiteSettingsState {
  platformEnabled: boolean;
  analysisButtonEnabled: boolean;
  commentAnalysisEnabled: boolean;
  replyAssistantEnabled: boolean;
  analysisMode: "fast" | "balanced" | "deep";
  analyzeLimit: number;
}

export type ToneOptionSet = {
  language: "en" | "zh";
  options: readonly string[];
};

export type ThemeState = {
  isDark: boolean;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  surface: string;
  background: string;
  accent: string;
  primaryText: string;
  success: string;
  error: string;
  fontFamily: string;
  shadow: string;
};

export type ReplySettingsState = ReplyAssistantSettings;

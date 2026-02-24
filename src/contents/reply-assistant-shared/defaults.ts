import type { AnalysisMode, ReplyAssistantSettings } from "~types";
import type { SiteSettingsState } from "./types";

export const DEFAULT_REPLY_SETTINGS_EN: ReplyAssistantSettings = {
  tone: "Objective",
  replyLength: "medium",
};

export const DEFAULT_REPLY_SETTINGS_ZH: ReplyAssistantSettings = {
  tone: "客观",
  replyLength: "medium",
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsState = {
  platformEnabled: true,
  analysisButtonEnabled: true,
  commentAnalysisEnabled: false,
  replyAssistantEnabled: true,
  analysisMode: "balanced" satisfies AnalysisMode,
  analyzeLimit: 15,
};

import { LLMService } from "../services/LLMService";
import { ZhihuClient } from "../services/ZhihuClient";
import { ConfigService } from "../services/ConfigService";
import { ProfileService } from "../services/ProfileService";
import { HistoryService } from "../services/HistoryService";
import { TopicService } from "../services/TopicService";
import { CommentAnalysisService } from "../services/CommentAnalysisService";
import { I18nService } from "../services/I18nService";
import { LabelService } from "../services/LabelService";
import { TelemetryService } from "../services/TelemetryService";
import { ReplyAssistantService } from "../services/ReplyAssistantService";
import type { SupportedPlatform } from "../types";

export {};

console.log("DeepProfile Background Service Started");

// Initialize I18n
I18nService.init();

// Open options page on install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    chrome.runtime.openOptionsPage();
  }
});

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Track active intervals to prevent leaks
const activeIntervals = new Set<NodeJS.Timeout>();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_PROFILE") {
    const tabId = sender.tab?.id;

    handleAnalysis(
      request.userId,
      request.context,
      tabId,
      request.platform,
      request.forceRefresh,
    )
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => {
        TelemetryService.recordError("analysis_failed", {
          platform: request.platform,
          userId: request.userId,
          message: error.message,
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (request.type === "ANALYZE_COMMENTS") {
    // 如果有 answerId，先获取回答内容
    const analyzeWithContext = async () => {
      const contextTitle = request.contextTitle;
      let contextContent = request.contextContent;

      // 如果前端没有提取到内容，但提供了 answerId，则尝试从 API 获取
      if (!contextContent && request.answerId) {
        try {
          const answerContent = await ZhihuClient.fetchAnswerContentForContext(
            request.answerId,
          );
          if (answerContent) {
            // 截取一部分内容作为上下文，避免过长
            contextContent = answerContent
              .replace(/<[^>]*>?/gm, "")
              .slice(0, 1000);
          }
        } catch (e) {
          console.warn("Failed to fetch answer content for context:", e);
        }
      }

      // 如果请求中包含语言设置，则更新 I18nService
      if (request.language) {
        I18nService.setLanguage(request.language);
      }

      return CommentAnalysisService.analyzeComments(
        request.comments,
        contextTitle,
        contextContent,
        request.platform,
      );
    };

    const startTime = Date.now();
    TelemetryService.recordEvent("comment_analysis_requested", {
      platform: request.platform || "zhihu",
    });

    analyzeWithContext()
      .then((result) => {
        TelemetryService.recordPerformance("comment_analysis_completed", {
          platform: request.platform || "zhihu",
          durationMs: Date.now() - startTime,
          commentCount: request.comments?.length || 0,
        });
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        TelemetryService.recordError("comment_analysis_failed", {
          platform: request.platform || "zhihu",
          message: error.message,
        });
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.type === "GENERATE_REPLY") {
    const startTime = Date.now();
    TelemetryService.recordEvent("reply_generation_requested", {
      platform: request.platform || "zhihu",
      tone: request.tone,
      replyLength: request.replyLength || "medium",
    });

    ReplyAssistantService.generateReply(
      request.tone,
      request.context,
      request.replyLength || "medium",
      request.preferredLanguage,
      request.preferredLanguageName,
      request.languageDetectionSource,
    )
      .then((reply) => {
        TelemetryService.recordPerformance("reply_generation_completed", {
          platform: request.platform || "zhihu",
          durationMs: Date.now() - startTime,
          length: reply.length,
        });
        sendResponse({ success: true, data: { reply } });
      })
      .catch((error) => {
        TelemetryService.recordError("reply_generation_failed", {
          platform: request.platform || "zhihu",
          message: error.message,
        });
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (request.type === "LIST_MODELS") {
    listModels(request.provider, request.apiKey, request.baseUrl)
      .then((models) => sendResponse({ success: true, data: models }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === "TEST_CONNECTION") {
    testConnection(
      request.provider,
      request.apiKey,
      request.baseUrl,
      request.model,
    )
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === "TELEMETRY_EVENT") {
    TelemetryService.recordEvent(request.name, request.data);
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "TELEMETRY_ERROR") {
    TelemetryService.recordError(request.name, request.data);
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "TELEMETRY_PERFORMANCE") {
    TelemetryService.recordPerformance(request.name, request.data);
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "TELEMETRY_COMPLIANCE") {
    TelemetryService.recordCompliance(request.name, request.data);
    sendResponse({ success: true });
    return true;
  }
});

async function testConnection(
  provider: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<string> {
  const testPrompt = "Hello";
  let url = "";
  let body = {};
  const headers: any = { "Content-Type": "application/json" };

  if (
    provider === "openai" ||
    provider === "deepseek" ||
    provider === "qwen" ||
    provider === "qwen-intl" ||
    provider === "custom"
  ) {
    if (provider === "openai")
      url = "https://api.openai.com/v1/chat/completions";
    else if (provider === "deepseek")
      url = "https://api.deepseek.com/v1/chat/completions";
    else if (provider === "qwen")
      url =
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    else if (provider === "qwen-intl")
      url =
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
    else if (provider === "custom") url = `${baseUrl}/chat/completions`;

    if (baseUrl && provider !== "custom") url = `${baseUrl}/chat/completions`;

    headers["Authorization"] = `Bearer ${apiKey}`;
    body = {
      model:
        model ||
        (provider === "qwen" || provider === "qwen-intl"
          ? "qwen-turbo"
          : "gpt-3.5-turbo"),
      messages: [{ role: "user", content: testPrompt }],
      max_tokens: 5,
    };
  } else if (provider === "ollama") {
    url = `${baseUrl || "http://localhost:11434"}/api/generate`;
    body = {
      model: model || "llama3",
      prompt: testPrompt,
      stream: false,
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;
    body = {
      contents: [{ parts: [{ text: testPrompt }] }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let friendlyMsg = `API Error (${response.status})`;

    if (response.status === 401) friendlyMsg = I18nService.t("error_401");
    else if (response.status === 402) friendlyMsg = I18nService.t("error_402");
    else if (response.status === 404) friendlyMsg = I18nService.t("error_404");
    else if (response.status === 429) friendlyMsg = I18nService.t("error_429");

    throw new Error(`${friendlyMsg} \nDetails: ${errText.slice(0, 100)}`);
  }

  return I18nService.t("connection_success");
}

async function listModels(
  provider: string,
  apiKey: string,
  baseUrl: string,
): Promise<string[]> {
  try {
    if (
      provider === "openai" ||
      provider === "deepseek" ||
      provider === "qwen" ||
      provider === "qwen-intl" ||
      provider === "custom"
    ) {
      let url = "";
      if (provider === "openai") url = "https://api.openai.com/v1/models";
      else if (provider === "deepseek")
        url = "https://api.deepseek.com/v1/models";
      else if (provider === "qwen")
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/models";
      else if (provider === "qwen-intl")
        url = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models";
      else if (provider === "custom") url = `${baseUrl}/models`;

      if (baseUrl && provider !== "custom") {
        url = `${baseUrl}/models`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        if (
          (provider === "qwen" || provider === "qwen-intl") &&
          shouldUseQwenFallback(response.status, errText)
        ) {
          const cached = await getCachedModels(provider);
          if (cached?.length) {
            console.warn(
              "Qwen models endpoint failed, using cached list.",
              response.status,
              errText,
            );
            return cached;
          }
          console.warn(
            "Qwen models endpoint failed, using fallback list.",
            response.status,
            errText,
          );
          return getQwenFallbackModels();
        }
        throw new Error(
          `Failed to fetch models: ${response.status} ${errText}`,
        );
      }

      const data = await response.json();
      const models = data.data.map((m: any) => m.id).sort();
      await setCachedModels(provider, models);
      return models;
    } else if (provider === "ollama") {
      const url = `${baseUrl || "http://localhost:11434"}/api/tags`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch models: ${response.status}`);
      const data = await response.json();
      const models = data.models.map((m: any) => m.name).sort();
      await setCachedModels(provider, models);
      return models;
    } else if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch models: ${response.status}`);
      const data = await response.json();
      const models = (data.models || [])
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => m.name.replace("models/", ""))
        .sort();
      await setCachedModels(provider, models);
      return models;
    }
    return [];
  } catch (e: any) {
    if (
      (provider === "qwen" || provider === "qwen-intl") &&
      shouldUseQwenFallback(undefined, e?.message || "")
    ) {
      const cached = await getCachedModels(provider);
      if (cached?.length) {
        console.warn("Qwen models fetch error, using cached list.", e);
        return cached;
      }
      console.warn("Qwen models fetch error, using fallback list.", e);
      return getQwenFallbackModels();
    }
    console.error("List models error:", e);
    throw e;
  }
}

const MODEL_CACHE_KEY = "deep_profile_model_cache";

async function getCachedModels(provider: string): Promise<string[] | null> {
  try {
    if (!chrome?.storage?.local) return null;
    const result = await chrome.storage.local.get(MODEL_CACHE_KEY);
    const cache = result[MODEL_CACHE_KEY] || {};
    const entry = cache[provider];
    if (!entry || !Array.isArray(entry.models)) return null;
    return entry.models;
  } catch (e) {
    return null;
  }
}

async function setCachedModels(
  provider: string,
  models: string[],
): Promise<void> {
  try {
    if (!chrome?.storage?.local) return;
    const result = await chrome.storage.local.get(MODEL_CACHE_KEY);
    const cache = result[MODEL_CACHE_KEY] || {};
    cache[provider] = { models, updatedAt: Date.now() };
    await chrome.storage.local.set({ [MODEL_CACHE_KEY]: cache });
  } catch (e) {
    // Ignore cache write failures
  }
}

function shouldUseQwenFallback(status?: number, message?: string) {
  if (status && status >= 500) return true;
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid header name") ||
    normalized.includes("dashscope")
  );
}

function getQwenFallbackModels(): string[] {
  return [
    "qwen-turbo",
    "qwen-plus",
    "qwen-max",
    "qwen-max-longcontext",
    "qwen-long",
  ];
}

type ProgressMeta = {
  elapsedMs?: number;
  estimatedMs?: number;
  overdue?: boolean;
  phase?: "estimate" | "overtime" | "finalizing";
};

async function sendProgress(
  tabId: number | undefined,
  message: string,
  percentage?: number,
  meta?: ProgressMeta,
) {
  if (tabId) {
    try {
      const messageObj: any = {
        type: "ANALYSIS_PROGRESS",
        message,
      };
      if (percentage !== undefined) {
        messageObj.type = "ANALYSIS_PROGRESS_ESTIMATE";
        messageObj.percentage = percentage;
      }
      if (meta) {
        messageObj.elapsedMs = meta.elapsedMs;
        messageObj.estimatedMs = meta.estimatedMs;
        messageObj.overdue = meta.overdue;
        messageObj.phase = meta.phase;
      }
      await chrome.tabs.sendMessage(tabId, messageObj);
    } catch (e) {
      // Ignore if tab is closed or message fails
    }
  }
}

function estimateAnalysisTime(mode: string): number {
  switch (mode) {
    case "fast":
      return 30000; // 15 + 15 seconds for fast mode
    case "deep":
      return 60000; // 45 + 15 seconds for deep mode
    case "balanced":
    default:
      return 40000; // 25 + 15 seconds for balanced mode
  }
}

function getProgressSnapshot(elapsedMs: number, estimatedMs: number) {
  const safeEstimate = Math.max(estimatedMs, 10000);
  let percentage = 0;

  if (elapsedMs <= safeEstimate) {
    percentage = Math.floor((elapsedMs / safeEstimate) * 85);
  } else if (elapsedMs <= safeEstimate * 2) {
    percentage =
      85 + Math.floor(((elapsedMs - safeEstimate) / safeEstimate) * 8);
  } else if (elapsedMs <= safeEstimate * 4) {
    percentage =
      93 +
      Math.floor(((elapsedMs - safeEstimate * 2) / (safeEstimate * 2)) * 4);
  } else {
    percentage =
      97 +
      Math.floor(((elapsedMs - safeEstimate * 4) / (safeEstimate * 4)) * 2);
  }

  percentage = Math.min(99, Math.max(1, percentage));

  return {
    percentage,
    overdue: elapsedMs > safeEstimate,
    phase:
      elapsedMs > safeEstimate * 3
        ? "finalizing"
        : elapsedMs > safeEstimate
          ? "overtime"
          : "estimate",
  } as const;
}

async function handleAnalysis(
  userId: string,
  context?: string,
  tabId?: number,
  platform: SupportedPlatform = "zhihu",
  forceRefresh: boolean = false,
) {
  // Ensure I18n is initialized with current config
  await I18nService.init();

  // Refresh label cache to ensure language is up-to-date
  const labelService = LabelService.getInstance();
  labelService.refreshCategories();

  console.log(
    `Analyzing user: ${userId}, Platform: ${platform}, Context: ${context}, ForceRefresh: ${forceRefresh}`,
  );
  const startTime = Date.now();
  TelemetryService.recordEvent("analysis_started", {
    platform,
    forceRefresh,
  });

  // Get analysis mode to estimate time
  const config = await ConfigService.getConfig();
  const analysisMode = platform
    ? config.platformAnalysisModes?.[platform] ||
      config.analysisMode ||
      "balanced"
    : config.analysisMode || "balanced";
  const estimatedTime = estimateAnalysisTime(analysisMode);

  // 1. Classify the context into a macro category
  let macroCategory = TopicService.classify(context || "");
  if (macroCategory === "general") {
    console.log(
      "Keyword classification failed, falling back to LLM classification...",
    );
    await sendProgress(tabId, I18nService.t("analyzing") + "...");
    macroCategory = await TopicService.classifyWithLLM(context || "");
  }
  const categoryName = TopicService.getCategoryName(macroCategory);
  console.log(`Context classified as: ${macroCategory} (${categoryName})`);

  // 2. Check cache first (if not forced)
  if (!forceRefresh) {
    // Use macroCategory for cache lookup
    const cachedProfile = await HistoryService.getProfile(
      userId,
      platform,
      macroCategory,
    );
    const userRecord = await HistoryService.getUserRecord(userId, platform);

    if (cachedProfile) {
      console.log(`Cache hit for user ${userId} in category ${macroCategory}`);
      await sendProgress(
        tabId,
        `${I18nService.t("history_record")} (${categoryName})`,
      );

      return {
        profile: cachedProfile.profileData,
        items: [],
        userProfile: userRecord?.userInfo || null, // Return cached user info if available
        fromCache: true,
        cachedAt: cachedProfile.timestamp,
        cachedContext: cachedProfile.context, // Return the original context stored in cache
      };
    }
  }

  const limit = config.analyzeLimit || 15;

  // Initial progress message
  await sendProgress(tabId, `${I18nService.t("analyzing")}...`);

  // Start periodic progress updates
  // We will update the message dynamically in the steps below
  let currentMessage = I18nService.t("analyzing");

  // Custom periodic progress function that uses the current message variable
  const progressInterval = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const snapshot = getProgressSnapshot(elapsed, estimatedTime);

    // Send current message with progress and timing context
    await sendProgress(tabId, currentMessage, snapshot.percentage, {
      elapsedMs: elapsed,
      estimatedMs: estimatedTime,
      overdue: snapshot.overdue,
      phase: snapshot.phase,
    });
  }, 1000);

  // Add interval to our tracking set
  activeIntervals.add(progressInterval);

  // Keep interval running until analysis finishes; cleanup happens in finally.

  try {
    const userProfile = await ProfileService.fetchUserProfile(platform, userId);

    if (userProfile) {
      // Update message to show we are reading user profile
      currentMessage = `${I18nService.t("reading_user_profile")}: ${userProfile.name}`;
      await sendProgress(tabId, currentMessage);
    }

    const fetchResult = await ProfileService.fetchUserContent(
      platform,
      userId,
      limit,
      context,
    );
    const items = fetchResult.items;

    if (!items || items.length === 0) {
      if (!userProfile) {
        throw new Error(I18nService.t("error_user_not_found"));
      }
    }

    // Update message to show we are reading content
    currentMessage = `${I18nService.t("reading_content")} (${items.length} items)`;
    await sendProgress(tabId, currentMessage);

    // --- Structured Context for LLM ---
    let contextForLLM = "";
    if (context) {
      const parts = context.split("|").map((s) => s.trim());
      const title = parts[0];
      const tags = parts.slice(1);
      contextForLLM += `【Question】: ${title}\n`;
      if (tags.length > 0) {
        contextForLLM += `【Topics】: ${tags.join(", ")}\n\n`;
      }
    }

    const sensitiveProviders = new Set([
      "openai",
      "gemini",
      "deepseek",
      "qwen",
      "qwen-intl",
      "custom",
    ]);
    const shouldRedactSensitiveContent =
      config.redactSensitiveMode === "always" ||
      (config.redactSensitiveMode === "sensitive-providers" &&
        sensitiveProviders.has(config.selectedProvider));

    let cleanText = ProfileService.cleanContentData(
      platform,
      items,
      userProfile,
      {
        redactSensitive: shouldRedactSensitiveContent,
        minRelevantRatio: 0.8,
        includeMetadata: true,
        includeExcerpt: analysisMode !== "fast",
      },
    );

    if (contextForLLM) {
      cleanText = contextForLLM + cleanText;
    }

    // Update message to show AI is analyzing
    currentMessage = I18nService.t("ai_analyzing");
    await sendProgress(tabId, currentMessage);

    const llmResponse = await LLMService.generateProfileForPlatform(
      cleanText,
      macroCategory,
      platform,
    );

    const totalDuration = Date.now() - startTime;
    TelemetryService.recordPerformance("analysis_completed", {
      platform,
      durationMs: totalDuration,
      itemsCount: items.length,
      analysisMode,
    });

    const redactionOff = config.redactSensitiveMode === "never";
    const redactionSensitive =
      config.redactSensitiveMode === "sensitive-providers" &&
      sensitiveProviders.has(config.selectedProvider);
    if (redactionOff || redactionSensitive) {
      TelemetryService.recordCompliance("redaction_mode_active", {
        platform,
        redactSensitiveMode: config.redactSensitiveMode,
        provider: config.selectedProvider,
      });
    }

    // 3. Save to History using macroCategory
    await HistoryService.saveProfile(
      userId,
      platform,
      macroCategory, // Store macroCategory as the key
      llmResponse.content,
      context || "", // Store original context for reference
      llmResponse.model,
      userProfile
        ? {
            name: userProfile.name,
            headline: userProfile.headline,
            avatar_url: userProfile.avatar_url,
            url_token: userProfile.url_token,
          }
        : undefined,
    );

    let debugInfo = undefined;
    if (config.enableDebug) {
      const createdCount = items.filter(
        (i) => i.action_type === "created",
      ).length;
      const votedCount = items.filter((i) => i.action_type === "voted").length;

      const sourceInfo = `Top ${items.length} of ${fetchResult.totalFetched} (Found ${fetchResult.totalRelevant} relevant)`;

      debugInfo = {
        totalDurationMs: totalDuration,
        llmDurationMs: llmResponse.durationMs,
        itemsCount: items.length,
        itemsBreakdown: `Created: ${createdCount}, Voted: ${votedCount}`,
        sourceInfo: sourceInfo,
        model: llmResponse.model,
        tokens: llmResponse.usage,
        context: context || "None",
        fetchStrategy: context
          ? `Context-Aware (Limit: ${limit})`
          : `Chronological (Limit: ${limit})`,
        platform: platform,
        llmInput: config.enableDebug ? cleanText : undefined, // 只在调试模式下保存输入
      };
    }

    return {
      profile: llmResponse.content,
      items: items,
      userProfile: userProfile,
      debugInfo: debugInfo,
      fromCache: false,
    };
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes("402")) msg = I18nService.t("error_402");
    else if (msg.includes("401")) msg = I18nService.t("error_401");
    else if (msg.includes("429")) msg = I18nService.t("error_429");
    else if (msg.includes("404")) msg = I18nService.t("error_404");
    else if (msg.includes("500")) msg = I18nService.t("error_500");
    else if (msg.includes("Failed to fetch"))
      msg = I18nService.t("error_network");

    TelemetryService.recordError("analysis_exception", {
      platform,
      userId,
      message: msg,
    });
    throw new Error(msg);
  } finally {
    // Clean up any remaining intervals in the finally block
    if (progressInterval) {
      clearInterval(progressInterval);
      activeIntervals.delete(progressInterval);
    }
  }
}

// Clean up all intervals when service worker is terminated (only if API is available)
if (chrome.runtime && chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    activeIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    activeIntervals.clear();
  });
}

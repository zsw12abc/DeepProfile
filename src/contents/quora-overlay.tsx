import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProfileCard } from "../components/ProfileCard";
import { ConfigService } from "../services/ConfigService";
import { I18nService } from "../services/I18nService";
import type { ZhihuContent, UserProfile } from "../services/ZhihuClient";
import type {
  AnalysisProgress,
  ProfileData,
  SupportedPlatform,
} from "../types";
import { DEFAULT_CONFIG } from "../types";
import { createInjectionScheduler } from "./injection-utils";

export const config: PlasmoCSConfig = {
  matches: ["https://www.quora.com/profile/*", "https://www.quora.com/*"],
};

const QuoraOverlay = () => {
  const [targetUser, setTargetUser] = useState<string | null>(null);
  const [initialNickname, setInitialNickname] = useState<string | undefined>();
  const [currentContext, setCurrentContext] = useState<string | undefined>();
  const [profileData, setProfileData] = useState<{
    profile: any; // Changed to any to match ProfileCard props
    items: ZhihuContent[];
    userProfile: UserProfile | null;
    debugInfo?: any;
    fromCache?: boolean;
    cachedAt?: number;
    cachedContext?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(() => {
    try {
      return I18nService.t("loading");
    } catch (e) {
      console.warn(
        "Failed to get translation, extension context may be invalidated:",
        e,
      );
      return "Loading...";
    }
  });
  const [progressInfo, setProgressInfo] = useState<
    AnalysisProgress | undefined
  >(undefined);
  const [error, setError] = useState<string | undefined>();
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    // Initialize I18n
    try {
      I18nService.init();
    } catch (e) {
      console.warn(
        "Failed to initialize I18n, extension context may be invalidated:",
        e,
      );
    }

    // Listen for progress messages from background
    const messageListener = (request: any) => {
      if (request.type === "ANALYSIS_PROGRESS") {
        setStatusMessage(request.message);
        setProgressInfo((prev) => ({
          percentage: prev?.percentage,
          elapsedMs: request.elapsedMs ?? prev?.elapsedMs,
          estimatedMs: request.estimatedMs ?? prev?.estimatedMs,
          overdue: request.overdue ?? prev?.overdue,
          phase: request.phase ?? prev?.phase,
        }));
      } else if (request.type === "ANALYSIS_PROGRESS_ESTIMATE") {
        setStatusMessage(request.message);
        setProgressInfo({
          percentage: request.percentage,
          elapsedMs: request.elapsedMs,
          estimatedMs: request.estimatedMs,
          overdue: request.overdue,
          phase: request.phase,
        });
      }
    };

    // 安全地添加消息监听器
    try {
      chrome.runtime.onMessage.addListener(messageListener);
    } catch (e) {
      console.warn(
        "Failed to add message listener, extension context may be invalidated:",
        e,
      );
    }

    // 安全地清理事件监听器
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener);
      } catch (e) {
        // 忽略上下文失效错误
        console.debug(
          "Extension context may have been invalidated, ignoring error:",
          e,
        );
      }
    };
  }, []);

  // 创建独立的overlay容器
  const createOverlayContainer = useCallback(() => {
    // Check if document is available
    if (typeof document === "undefined" || !document.body) {
      console.warn("Document not available for overlay container creation");
      return null;
    }

    let container = document.getElementById("deep-profile-overlay-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "deep-profile-overlay-container";
      // 容器本身不设置样式，由ProfileCard组件控制
      document.body.appendChild(container);
    }

    return container;
  }, []);

  // 移除overlay容器
  const removeOverlayContainer = useCallback(() => {
    // Check if document is available
    if (typeof document === "undefined") {
      console.warn("Document not available for overlay container removal");
      return;
    }

    const container = document.getElementById("deep-profile-overlay-container");
    if (container) {
      // 如果存在React root，先卸载它
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      container.remove();
    }
  }, []);

  // 渲染overlay到独立容器
  useEffect(() => {
    if (targetUser) {
      const container = createOverlayContainer();

      // 检查容器是否存在
      if (!container) {
        console.warn("Failed to create overlay container");
        return;
      }

      // 如果还没有创建root，就创建一个新的
      if (!rootRef.current) {
        rootRef.current = createRoot(container);
      }

      // 准备ProfileCard所需的数据结构
      const recordData = {
        userId: targetUser,
        platform: "quora" as SupportedPlatform,
        nickname: initialNickname || targetUser,
        profileData: profileData?.profile || null,
        items: profileData?.items || [],
        userProfile: profileData?.userProfile || null,
        debugInfo: profileData?.debugInfo,
        fromCache: profileData?.fromCache || false,
        cachedAt: profileData?.cachedAt || 0,
        cachedContext: profileData?.cachedContext || "",
      };

      // 无论何时，只要状态改变就重新渲染
      try {
        rootRef.current.render(
          <ProfileCard
            record={recordData}
            platform={"quora"}
            isLoading={loading}
            statusMessage={statusMessage}
            progressInfo={progressInfo}
            error={error}
            onRefresh={() => {
              if (targetUser) {
                handleAnalyze(
                  targetUser,
                  initialNickname,
                  currentContext,
                  true,
                );
              }
            }}
            onClose={() => setTargetUser(null)}
            onExport={undefined}
          />,
        );
      } catch (e) {
        console.error("Failed to render ProfileCard:", e);
      }

      // 添加点击外部区域关闭overlay的功能
      const handleClickOutside = (event: MouseEvent) => {
        // 检查点击是否在ProfileCard内部
        // 由于ProfileCard渲染在container内部，我们只需要检查container是否包含target
        // 但是ProfileCard组件本身有样式，container只是一个包装器
        // 实际上ProfileCard组件渲染了一个fixed定位的div，我们需要确保点击不在那个div上
        // 这里简化处理：如果点击的是container本身（如果它覆盖全屏）或者body，则关闭
        // 但目前的实现container只是一个挂载点，ProfileCard是fixed定位
        // 最好的方式是在ProfileCard内部处理点击外部，或者在这里不做处理，只依赖关闭按钮
        // 为了用户体验，我们暂时只依赖关闭按钮，避免误触关闭
      };

      // document.addEventListener('mousedown', handleClickOutside);

      return () => {
        // document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      // 当没有目标用户时，移除容器
      removeOverlayContainer();
    }
  }, [
    targetUser,
    profileData,
    loading,
    statusMessage,
    error,
    initialNickname,
    currentContext,
    progressInfo,
  ]);

  // 监听来自后台脚本的消息
  useEffect(() => {
    const handleMessageFromBackground = async (
      request: any,
      sender: any,
      sendResponse: (response: any) => void,
    ) => {
      if (request && request.type === "QUORA_CONTENT_REQUEST") {
        const { requestId, username, limit, url } = request;

        // 从页面中抓取Quora内容
        const scrapedContent = await scrapeQuoraContent(username, limit);

        // 发送响应回后台脚本
        chrome.runtime
          .sendMessage({
            type: "QUORA_CONTENT_RESPONSE",
            requestId,
            content: scrapedContent,
          })
          .catch((error) => {
            console.warn(
              "Failed to send response to background script:",
              error,
            );
          });
      }
    };

    // 安全地添加消息监听器
    try {
      chrome.runtime.onMessage.addListener(handleMessageFromBackground);
    } catch (e) {
      console.warn(
        "Failed to add message listener, extension context may be invalidated:",
        e,
      );
    }

    return () => {
      // 安全地清理事件监听器
      try {
        chrome.runtime.onMessage.removeListener(handleMessageFromBackground);
      } catch (e) {
        console.warn(
          "Failed to remove message listener, extension context may be invalidated:",
          e,
        );
      }
    };
  }, []);

  useEffect(() => {
    let isEnabled = false;

    // 清理函数：停止观察并移除所有已注入的元素
    const cleanup = () => {
      scheduler.stop();
      document
        .querySelectorAll(".deep-profile-btn")
        .forEach((el) => el.remove());
      document
        .querySelectorAll("[data-deep-profile-injected]")
        .forEach((el) => el.removeAttribute("data-deep-profile-injected"));
    };

    // 注入逻辑
    const injectButtons = (root?: ParentNode) => {
      if (!isEnabled || typeof document === "undefined") return;

      const scope = root && "querySelectorAll" in root ? root : document;
      const isFullScan = scope === document;

      if (isFullScan) {
        // 1. 清理孤儿按钮
        try {
          document.querySelectorAll(".deep-profile-btn").forEach((btn) => {
            const prev = btn.previousElementSibling as HTMLAnchorElement | null;
            if (
              !prev ||
              prev.tagName !== "A" ||
              !prev.href.includes("/profile/")
            ) {
              btn.remove();
            }
          });
        } catch (e) {
          console.warn(
            "Failed to clean orphaned buttons, document may not be available:",
            e,
          );
          return; // Exit early if document operations fail
        }

        // 2. 检查并重置状态
        try {
          const injectedLinks = document.querySelectorAll(
            'a[data-deep-profile-injected="true"]',
          );
          injectedLinks.forEach((link) => {
            const next = link.nextElementSibling;
            if (!next || !next.classList.contains("deep-profile-btn")) {
              link.removeAttribute("data-deep-profile-injected");
            }
          });
        } catch (e) {
          console.warn(
            "Failed to reset button states, document may not be available:",
            e,
          );
          return; // Exit early if document operations fail
        }
      }

      // 3. 注入新按钮
      let links;
      try {
        links = scope.querySelectorAll('a[href*="/profile/"]');
      } catch (e) {
        console.warn(
          "Failed to query user links, document may not be available:",
          e,
        );
        return; // Exit early if document operations fail
      }

      links.forEach((element) => {
        const link = element as HTMLAnchorElement;
        if (link.getAttribute("data-deep-profile-injected")) return;

        const href = link.href;
        // 提取Quora用户名
        const match = href.match(/\/profile\/([^\/\?#]+)/i);
        if (!match) return;

        const userId = match[1];

        if (
          !userId ||
          userId === "search" ||
          userId === "notifications" ||
          userId === "following" ||
          userId === "followers" ||
          userId === "following_topics" ||
          userId === "following_collections" ||
          userId === "following_blogs" ||
          userId === "following_questions" ||
          userId === "following_posts" ||
          userId === "logs" ||
          userId === "badges" ||
          userId === "edits" ||
          userId === "answers" ||
          userId === "questions" ||
          userId === "posts" ||
          userId === "content"
        )
          return;
        if (link.querySelector("img")) return;
        if (!link.textContent?.trim()) return;
        if (
          link.closest(".profile_photo") ||
          link.closest('[aria-label*="photo"]')
        )
          return;

        const btn = document.createElement("span");
        btn.innerHTML = "⚡";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "12px";
        btn.style.marginLeft = "6px";
        btn.style.color = "#2563eb";
        btn.style.verticalAlign = "middle";
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.width = "22px";
        btn.style.height = "22px";
        btn.style.borderRadius = "999px";
        btn.style.border = "1px solid rgba(37, 99, 235, 0.25)";
        btn.style.background =
          "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(34, 211, 238, 0.18))";
        btn.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.18)";
        btn.style.transition = "all 0.2s ease";
        try {
          btn.title = I18nService.t("deep_profile_analysis");
        } catch (e) {
          btn.title = "Deep Profile Analysis";
          console.warn(
            "Failed to get translation, extension context may be invalidated:",
            e,
          );
        }
        btn.className = "deep-profile-btn";

        btn.onmouseover = () => {
          btn.style.color = "#ffffff";
          btn.style.background = "linear-gradient(135deg, #2563eb, #22d3ee)";
          btn.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.35)";
          btn.style.transform = "translateY(-1px)";
        };
        btn.onmouseout = () => {
          btn.style.color = "#2563eb";
          btn.style.background =
            "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(34, 211, 238, 0.18))";
          btn.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.18)";
          btn.style.transform = "translateY(0)";
        };

        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // 阻止链接的默认行为，防止Quora悬停卡片显示
          e.stopImmediatePropagation();

          const nickname = link.textContent?.trim();

          // Extract context from the current question/answer
          let contextParts: string[] = [];

          // Get question title if available - try multiple selectors
          const questionSelectors = [
            "div.q-text span",
            "div.q-text",
            "h1.q-text",
            ".qu-word-break--break-word",
            '[data-testid="post_page_main_content"] .qu-word-break--break-word',
            ".pagedlist_item .qu-word-break--break-word",
          ];

          let questionTitle = null;
          for (const selector of questionSelectors) {
            questionTitle = document.querySelector(selector);
            if (questionTitle) break;
          }

          if (questionTitle) {
            contextParts.push(questionTitle.textContent?.trim() || "");
          }

          // Get topic tags if available
          const topicElements = document.querySelectorAll(
            'a[href*="/topic/"], span.q-box a, .qu-display--inline a',
          );
          topicElements.forEach((topic) => {
            const topicText = topic.textContent?.trim();
            if (
              topicText &&
              !contextParts.includes(topicText) &&
              topicText.length > 2
            ) {
              contextParts.push(topicText);
            }
          });

          const richContext = contextParts.filter(Boolean).join(" | ");

          // Set the target user to show the overlay
          setTargetUser(userId);
          setInitialNickname(nickname);
          setCurrentContext(richContext);
          try {
            chrome.runtime.sendMessage({
              type: "TELEMETRY_EVENT",
              name: "analysis_button_clicked",
              data: { platform: "quora" },
            });
          } catch (err) {
            // Ignore telemetry failures
          }

          // Also trigger the analysis
          handleAnalyze(userId, nickname, richContext);
        };

        link.setAttribute("data-deep-profile-injected", "true");

        if (link.parentNode) {
          link.parentNode.insertBefore(btn, link.nextSibling);
        }
      });
    };

    const scheduler = createInjectionScheduler({
      injectButtons,
      shouldProcess: () => isEnabled,
      debounceMs: 200,
    });

    const startInjection = () => {
      const root = document.body || document.documentElement;
      if (!root) return;
      scheduler.start(root);
    };

    const checkConfig = async () => {
      try {
        const config = await ConfigService.getConfig();
        const globalEnabled =
          config?.globalEnabled ?? DEFAULT_CONFIG.globalEnabled;
        const buttonEnabled =
          config?.platformConfigs?.quora?.analysisButtonEnabled ??
          DEFAULT_CONFIG.platformConfigs.quora.analysisButtonEnabled ??
          true;
        const newEnabled = globalEnabled && buttonEnabled;

        // console.log("Checking config. Enabled:", newEnabled);

        if (newEnabled !== isEnabled) {
          isEnabled = newEnabled;
          if (isEnabled) {
            startInjection();
          } else {
            cleanup();
          }
        } else if (isEnabled) {
          startInjection();
        }
      } catch (e) {
        console.warn(
          "Failed to get config, extension context may be invalidated:",
          e,
        );
      }
    };

    // Initial check
    try {
      checkConfig();
    } catch (e) {
      console.warn(
        "Failed initial config check, extension context may be invalidated:",
        e,
      );
    }

    // Listen for storage changes to react immediately to options changes
    const storageListener = (changes: any, area: string) => {
      if (area === "local" && changes["deep_profile_config"]) {
        try {
          checkConfig();
        } catch (e) {
          console.warn(
            "Failed to check config in storage listener, extension context may be invalidated:",
            e,
          );
        }
      }
    };

    // Safely add storage listener
    try {
      chrome.storage.onChanged.addListener(storageListener);
    } catch (e) {
      console.warn(
        "Failed to add storage listener, extension context may be invalidated:",
        e,
      );
    }

    return () => {
      try {
        chrome.storage.onChanged.removeListener(storageListener);
      } catch (e) {
        // 忽略上下文失效错误
        console.debug(
          "Extension context may have been invalidated, ignoring storage listener removal error:",
          e,
        );
      }
      cleanup();
    };
  }, []);

  const handleAnalyze = async (
    userId: string,
    nickname?: string,
    context?: string,
    forceRefresh: boolean = false,
  ) => {
    // Don't reset the UI state here since we want to keep the overlay visible
    setLoading(true);
    try {
      setStatusMessage(
        forceRefresh
          ? I18nService.t("reanalyze") + "..."
          : I18nService.t("analyzing") + "...",
      );
    } catch (e) {
      setStatusMessage(forceRefresh ? "Re-analyzing..." : "Analyzing...");
      console.warn(
        "Failed to get translation, extension context may be invalidated:",
        e,
      );
    }
    setError(undefined);
    if (forceRefresh) {
      setProfileData(null);
    }
    // Initialize progress to 0 to show the bar immediately
    setProgressInfo({
      percentage: 0,
      elapsedMs: 0,
      estimatedMs: undefined,
      overdue: false,
      phase: "estimate",
    });

    try {
      // Safe API call with context validation
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.sendMessage
      ) {
        const response = await chrome.runtime.sendMessage({
          type: "ANALYZE_PROFILE",
          userId,
          context, // Send rich context to background
          platform: "quora", // Specify platform
          forceRefresh,
        });

        if (response.success) {
          setProfileData(response.data);
        } else {
          setError(response.error);
        }
      } else {
        setError(I18nService.t("error_extension_context"));
      }
    } catch (err) {
      // Check if the error is due to context invalidation
      if (
        err instanceof Error &&
        err.message.includes("Extension context invalidated")
      ) {
        try {
          setError(I18nService.t("error_extension_context"));
        } catch (translationErr) {
          setError(
            "Extension context invalidated. Please refresh the page to retry.",
          );
        }
      } else {
        try {
          setError(I18nService.t("error_network"));
        } catch (translationErr) {
          setError("Network error. Please check your connection.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 从页面中抓取Quora内容
  const scrapeQuoraContent = async (
    username: string,
    limit: number = 15,
  ): Promise<any[]> => {
    try {
      // 获取当前页面的URL以确定是否是用户主页
      const currentUrl = window.location.href;
      const contentItems: any[] = [];
      const seenContent = new Set<string>();

      // Decode username for better matching
      const decodedUsername = decodeURIComponent(username);
      const usernameLower = username.toLowerCase();
      const decodedUsernameLower = decodedUsername.toLowerCase();

      console.log(
        `Scraping Quora content for ${username} (${decodedUsername}) on ${currentUrl}`,
      );

      // Helper to check if an element contains user link
      const hasUserLink = (el: Element): boolean => {
        const links = el.querySelectorAll("a");
        for (const link of Array.from(links)) {
          const href = link.getAttribute("href");
          if (href) {
            const hrefLower = href.toLowerCase();
            if (
              hrefLower.includes(`/profile/${usernameLower}`) ||
              hrefLower.includes(`/profile/${decodedUsernameLower}`)
            ) {
              return true;
            }
          }
        }
        return false;
      };

      // Helper to check if content is garbage (UI elements)
      const isGarbage = (text: string): boolean => {
        const lower = text.toLowerCase();
        // Check for profile stats patterns (e.g. "Profile 408 Answers...")
        if (/profile\s*\d+\s*answers/i.test(text)) return true;
        if (/^\d+\s*answers/i.test(text)) return true;
        if (
          lower.includes("profile") &&
          lower.includes("answers") &&
          lower.includes("questions")
        )
          return true;
        if (lower.includes("followers") && lower.includes("following"))
          return true;

        // Check for sort headers
        if (lower.includes("most recent") || lower.includes("all time"))
          return true;

        // Check for credentials and sidebar info
        if (lower.includes("credentials & highlights")) return true;
        if (lower.includes("space details")) return true;
        if (lower.includes("knows about")) return true;
        if (lower.includes("pinned")) return true; // Pinned posts might be okay, but "Pinned" label is garbage

        // Check for specific UI strings
        if (lower === "answer") return true;
        if (lower === "question") return true;
        if (lower === "post") return true;
        if (lower === "follow") return true;
        if (lower === "more") return true;
        if (lower === "less") return true;
        if (lower === "share") return true;
        if (lower === "upvote") return true;

        // Short credential strings often end with Contributor/Author/Admin
        if (
          text.length < 100 &&
          (lower.includes("contributor") ||
            lower.includes("author") ||
            lower.includes("admin"))
        )
          return true;

        return false;
      };

      let attempts = 0;
      const maxAttempts = 8; // Increased attempts to allow more scrolling

      while (contentItems.length < limit && attempts < maxAttempts) {
        // Broad selection of potential item containers
        // Removed generic .q-box classes that were catching UI elements
        // Removed .q-click-wrapper as it is too generic and catches profile headers
        let containers = Array.from(
          document.querySelectorAll(
            ".pagedlist_item, " +
              ".dom_annotate_question_answer_item, " +
              '[data-testid="feed_item"]',
          ),
        );

        // If few containers found, try a more aggressive approach by finding text blocks
        if (containers.length < 3) {
          const textBlocks = document.querySelectorAll(".q-text");
          const potentialContainers = new Set<Element>();
          textBlocks.forEach((block) => {
            // Only consider substantial text
            if (!block.textContent || block.textContent.length < 50) return;

            // Go up to find a container
            let parent = block.parentElement;
            for (let i = 0; i < 8; i++) {
              if (!parent) break;
              // Check if parent looks like a container (has siblings, or specific classes)
              if (
                parent.classList.contains("q-box") ||
                parent.tagName === "DIV"
              ) {
                // Check if it has a border or is a list item
                const style = window.getComputedStyle(parent);
                if (
                  style.borderBottomWidth !== "0px" ||
                  parent.parentElement?.childElementCount! > 3
                ) {
                  potentialContainers.add(parent);
                  // Don't break immediately, we might find a better outer container
                }
              }
              parent = parent.parentElement;
            }
          });
          if (potentialContainers.size > 0) {
            // Merge with existing containers
            const existingSet = new Set(containers);
            potentialContainers.forEach((c) => existingSet.add(c));
            containers = Array.from(existingSet);
          }
        }

        for (const container of containers) {
          if (contentItems.length >= limit) break;

          // Skip promoted content
          if (
            container.textContent?.includes("Promoted") ||
            container.querySelector(".promoted_tag")
          )
            continue;

          // Must have some text
          if (!container.textContent || container.textContent.length < 10)
            continue;

          // Determine if this is user's content
          let isUserContent = false;

          // If we are on the specific user's profile page
          if (
            currentUrl.toLowerCase().includes("/profile/" + usernameLower) ||
            currentUrl
              .toLowerCase()
              .includes("/profile/" + decodedUsernameLower)
          ) {
            // On profile page, we are more permissive
            if (
              currentUrl.includes("/answers") ||
              currentUrl.includes("/questions") ||
              currentUrl.includes("/posts")
            ) {
              isUserContent = true;
            } else {
              // Main profile page
              // If it has a user link, it's definitely related
              if (hasUserLink(container)) {
                isUserContent = true;
              } else {
                // If no user link, but we are on profile page, it might be their content
                // We accept it if it looks like a question or answer
                // But we must be careful not to pick up profile header
                // Check if it has interaction buttons (Upvote, Share, etc)
                if (
                  container.querySelector('[aria-label*="Upvote"]') ||
                  container.querySelector('[aria-label*="Share"]') ||
                  container.querySelector(".q-click-wrapper")
                ) {
                  isUserContent = true;
                }
              }
            }
          } else {
            // Not on profile page, must have explicit link
            if (hasUserLink(container)) {
              isUserContent = true;
            }
          }

          if (!isUserContent) continue;

          // Extract Title
          let title = "";
          // Try multiple selectors for title
          const titleSelectors = [
            ".puppeteer_test_question_title",
            ".q-text.qu-fontWeight--bold",
            "span.q-text.qu-fontWeight--bold",
            "div.q-text.qu-fontWeight--bold",
            "a.q-text.qu-fontWeight--bold", // Often the question is a link
          ];

          for (const selector of titleSelectors) {
            const el = container.querySelector(selector);
            if (el && el.textContent && el.textContent.length > 5) {
              title = el.textContent.trim();
              break;
            }
          }

          // Extract Content
          let content = "";
          let contentEl =
            container.querySelector(".puppeteer_test_answer_content") ||
            container.querySelector(".spacing_log_answer_content");

          if (contentEl) {
            content = contentEl.textContent?.trim() || "";
          } else {
            // Fallback: Find the longest text block
            const textBlocks = container.querySelectorAll(
              ".q-text, span, p, div",
            );
            let maxLen = 0;
            for (const block of Array.from(textBlocks)) {
              // Skip title
              if (title && block.textContent?.includes(title)) continue;
              // Skip small metadata
              if (block.textContent && block.textContent.length < 20) continue;
              // Skip if contains many links
              if (block.querySelectorAll("a").length > 3) continue;

              const text = block.textContent?.trim() || "";
              if (text.length > maxLen) {
                maxLen = text.length;
                content = text;
              }
            }
            // Only accept fallback if it's reasonably long to avoid UI noise
            if (maxLen < 50) content = "";
          }

          // Handle Questions (where content might be empty but title exists)
          let type: "answer" | "question" | "post" = "answer";
          if (
            !content &&
            title &&
            (title.includes("?") || currentUrl.includes("/questions"))
          ) {
            content = title;
            type = "question";
          }

          // Final cleanup
          if (content) {
            // If content is just the title, and it's not a question, ignore (might be just a link)
            if (title && content === title && type !== "question") continue;

            // If content is very short, ignore
            if (content.length < 5) continue;

            // Check for garbage
            if (isGarbage(content)) continue;

            // Safe content hash for deduplication
            const safeContent = content
              .substring(0, Math.min(100, content.length))
              .toLowerCase();
            // Simple hash to avoid btoa unicode issues
            let hash = 0;
            for (let i = 0; i < safeContent.length; i++) {
              hash = (hash << 5) - hash + safeContent.charCodeAt(i);
              hash |= 0;
            }
            const contentHash = "h" + Math.abs(hash).toString(36);

            if (!seenContent.has(contentHash)) {
              seenContent.add(contentHash);

              // Try to find a specific URL for this item
              let itemUrl = currentUrl;
              const answerLink = container.querySelector('a[href*="/answer/"]');
              const questionLink = container.querySelector(
                'a[href*="/unanswered/"], a[href*="/q/"]',
              );

              if (answerLink) itemUrl = (answerLink as HTMLAnchorElement).href;
              else if (questionLink)
                itemUrl = (questionLink as HTMLAnchorElement).href;

              contentItems.push({
                id: `quora-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title: title || (type === "question" ? "Question" : "Answer"),
                excerpt: content.substring(0, 200),
                content: content,
                created_time: Date.now(),
                url: itemUrl,
                action_type: "created",
                type: type,
                is_relevant: true,
              });
            }
          }
        }

        if (contentItems.length >= limit) break;

        // Scroll down to load more content
        console.log(
          `Found ${contentItems.length}/${limit} items. Scrolling...`,
        );
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 2000)); // Wait for load
        attempts++;
      }

      console.log(`Scraped ${contentItems.length} items`);
      return contentItems;
    } catch (error) {
      console.error("Error scraping Quora content:", error);
      return [];
    }
  };

  // 计算两个字符串的相似度
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = computeEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // 计算编辑距离（Levenshtein距离）
  const computeEditDistance = (s1: string, s2: string): number => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  };

  return <div style={{ display: "none" }} />;
};

export default QuoraOverlay;

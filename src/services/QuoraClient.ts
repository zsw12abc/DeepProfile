import type { ZhihuContent, UserProfile, FetchResult } from "./ZhihuClient";

export interface QuoraUser {
  id: string;
  username: string;
  name: string;
  bio?: string;
  follower_count?: number;
  following_count?: number;
  public_answers_count?: number;
  public_questions_count?: number;
  created_at?: string;
  profile_image_url?: string;
}

export interface QuoraContent {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  created_time: number;
  url: string;
  type: "answer" | "question" | "post";
  upvote_count?: number;
  comment_count?: number;
  topics?: string[];
}

export class QuoraClient {
  private static BASE_URL = "https://www.quora.com";

  static async fetchUserProfile(username: string): Promise<UserProfile | null> {
    try {
      // 对于Quora，我们无法通过API直接获取，而是需要通过内容脚本在页面中获取
      // 这里发送消息给内容脚本以获取用户信息
      console.log(`Attempting to fetch profile for Quora user: ${username}`);

      // 由于Quora的反爬虫机制，我们不能直接从后端获取数据
      // 需要通过内容脚本获取，因此这里返回基本的用户信息
      return {
        name: username,
        headline: `Quora user @${username}`,
        url_token: username,
      };
    } catch (e) {
      console.warn("Failed to fetch Quora user profile", e);
    }
    return null;
  }

  // 获取用户的公开内容（答案、问题等）
  static async fetchUserContent(
    username: string,
    limit: number = 15,
    context?: string,
  ): Promise<FetchResult> {
    try {
      console.log(
        `Attempting to fetch Quora content for user: ${username} via content script`,
      );

      // Quora用户回答页面URL格式: https://www.quora.com/profile/用户名/answers
      const quoraAnswersUrl = `https://www.quora.com/profile/${encodeURIComponent(username)}/answers`;

      // 通过Chrome扩展API与内容脚本通信
      const contentFromTab = await this.fetchContentFromTab(
        username,
        limit,
        quoraAnswersUrl,
      );

      return {
        items: contentFromTab,
        totalFetched: contentFromTab.length,
        totalRelevant: 0,
      };
    } catch (error) {
      console.error("Failed to fetch Quora content:", error);
      return {
        items: [],
        totalFetched: 0,
        totalRelevant: 0,
      };
    }
  }

  // 通过Chrome扩展API与内容脚本通信获取数据
  private static async fetchContentFromTab(
    username: string,
    limit: number,
    url: string,
  ): Promise<ZhihuContent[]> {
    return new Promise((resolve) => {
      // 获取当前活动标签页
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];

          if (activeTab && activeTab.id) {
            // 生成一个唯一的请求ID以便处理响应
            const requestId = `quora_fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 监听来自内容脚本的响应
            const responseCallback = (response: any) => {
              if (
                response &&
                response.type === "QUORA_CONTENT_RESPONSE" &&
                response.requestId === requestId
              ) {
                // 清理消息监听器
                chrome.runtime.onMessage.removeListener(responseCallback);
                resolve(response.content || []);
              }
            };

            // 添加消息监听器
            chrome.runtime.onMessage.addListener(responseCallback);

            // 向内容脚本发送消息请求数据
            chrome.tabs
              .sendMessage(activeTab.id, {
                type: "QUORA_CONTENT_REQUEST",
                requestId,
                username,
                limit,
                url,
              })
              .catch((error) => {
                console.warn(
                  "Failed to send message to content script:",
                  error,
                );
                // 清理监听器
                chrome.runtime.onMessage.removeListener(responseCallback);
                resolve([]); // 返回空数组
              });

            // 设置超时
            setTimeout(() => {
              chrome.runtime.onMessage.removeListener(responseCallback);
              console.warn("Quora content fetch timed out");
              resolve([]);
            }, 15000); // 15秒超时
          } else {
            console.warn("No active tab found");
            resolve([]);
          }
        });
      } else {
        console.warn("Chrome API not available");
        resolve([]);
      }
    });
  }

  // 获取特定内容的详细信息
  static async fetchDetailContent(
    id: string,
    type: "answer" | "question" = "answer",
  ): Promise<string | null> {
    try {
      // 由于API限制，返回空值
      return null;
    } catch (error) {
      console.error(`Error fetching ${type} ${id}:`, error);
      return null;
    }
  }

  // 根据上下文对内容进行相关性排序
  private static sortByRelevance(
    items: ZhihuContent[],
    context: string,
  ): ZhihuContent[] {
    const keywords = context
      .split("|")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1);

    const titlePart = keywords[0] || "";
    const bigrams = new Set<string>();
    for (let i = 0; i < titlePart.length - 1; i++) {
      bigrams.add(titlePart.substring(i, i + 2));
    }

    const getScore = (item: ZhihuContent) => {
      const text = (item.title + item.excerpt).toLowerCase();
      let score = 0;

      let keywordMatches = 0;
      keywords.forEach((kw) => {
        if (text.includes(kw)) keywordMatches++;
      });
      score += keywordMatches * 500;

      let bigramMatches = 0;
      bigrams.forEach((bg) => {
        if (text.includes(bg)) bigramMatches++;
      });
      score += bigramMatches * 20;

      if (keywordMatches > 0 || bigramMatches > 1) {
        item.is_relevant = true;
        score += 1000;
      } else {
        item.is_relevant = false;
      }

      score += item.created_time / 10000000000;

      if (item.action_type === "created") score += 5;

      return score;
    };

    return items.sort((a, b) => getScore(b) - getScore(a));
  }

  // 将Quora内容转换为通用格式
  private static convertToZhihuContent(quoraItem: QuoraContent): ZhihuContent {
    return {
      id: quoraItem.id,
      type: quoraItem.type === "answer" ? "answer" : "article",
      title: quoraItem.title,
      excerpt: quoraItem.excerpt,
      content: quoraItem.content,
      created_time: quoraItem.created_time,
      url: quoraItem.url,
      action_type: "created",
    };
  }
}

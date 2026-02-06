import type { ZhihuContent, UserProfile, FetchResult } from "./ZhihuClient";

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  created_at?: string;
  profile_image_url?: string;
}

export interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
}

export class TwitterClient {
  private static BASE_URL = "https://api.twitter.com/2";
  private static TWITTER_BASE_URL = "https://twitter.com";

  // 使用 Twitter API v2 的公共端点，需要开发者账户和 Bearer Token
  // 或者使用非官方方法抓取公开数据
  static async fetchUserProfile(username: string): Promise<UserProfile | null> {
    try {
      // 尝试使用公开的非API方式获取用户信息
      // 由于Twitter限制较多，这里使用模拟方法，实际部署时可能需要使用官方API
      const url = `${this.TWITTER_BASE_URL}/${username}`;

      // 由于在扩展中直接fetch Twitter会有CORS限制，我们返回一个基本的用户信息
      // 实际实现需要使用官方API或更复杂的代理方案
      return {
        name: username,
        headline: `Twitter user @${username}`,
        url_token: username,
      };
    } catch (e) {
      console.warn("Failed to fetch Twitter user profile", e);
    }
    return null;
  }

  // 获取用户的公开内容（推文、回复等）
  static async fetchUserContent(
    username: string,
    limit: number = 15,
    context?: string,
  ): Promise<FetchResult> {
    try {
      console.log(
        `Attempting to fetch Twitter content for user: ${username} via content script`,
      );

      // Twitter用户主页URL格式: https://twitter.com/用户名
      const twitterProfileUrl = `https://twitter.com/${encodeURIComponent(username)}`;

      // 通过Chrome扩展API与内容脚本通信
      const contentFromTab = await this.fetchContentFromTab(
        username,
        limit,
        twitterProfileUrl,
      );

      return {
        items: contentFromTab,
        totalFetched: contentFromTab.length,
        totalRelevant: 0,
      };
    } catch (error) {
      console.error("Failed to fetch Twitter content:", error);
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
            const requestId = `twitter_fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 监听来自内容脚本的响应
            const responseCallback = (response: any) => {
              if (
                response &&
                response.type === "TWITTER_CONTENT_RESPONSE" &&
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
                type: "TWITTER_CONTENT_REQUEST",
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
              console.warn("Twitter content fetch timed out");
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

  // 从Twitter API或网页获取推文详情
  static async fetchDetailContent(
    id: string,
    type: "tweet" | "reply" = "tweet",
  ): Promise<string | null> {
    try {
      // 由于API限制，这里返回空值
      // 实际实现需要使用官方API
      return null;
    } catch (error) {
      console.error(`Error fetching ${type} ${id}:`, error);
      return null;
    }
  }

  // 实现内容相关性排序
  private static sortByRelevance(
    items: ZhihuContent[],
    context: string,
  ): ZhihuContent[] {
    if (!context || items.length === 0) return items;

    const keywords = context
      .toLowerCase()
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    const titlePart = keywords[0] || "";
    const bigrams = new Set<string>();
    for (let i = 0; i < titlePart.length - 1; i++) {
      bigrams.add(titlePart.substring(i, i + 2));
    }

    const getScore = (item: ZhihuContent) => {
      const text = (
        item.title +
        " " +
        item.excerpt +
        " " +
        (item.content || "")
      ).toLowerCase();
      let score = 0;

      let keywordMatches = 0;
      keywords.forEach((kw) => {
        if (text.includes(kw.toLowerCase())) keywordMatches++;
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

  // 将Twitter帖子转换为通用格式
  private static convertToZhihuContent(
    tweet: TwitterPost,
    user: TwitterUser,
  ): ZhihuContent {
    const createdAt = new Date(tweet.created_at).getTime() / 1000;

    return {
      id: tweet.id,
      type: "article", // 将推文视为文章
      title: `Tweet from @${user.username}`,
      excerpt: tweet.text.substring(0, 200),
      content: tweet.text,
      created_time: createdAt,
      url: `https://twitter.com/${user.username}/status/${tweet.id}`,
      action_type: "created",
    };
  }
}

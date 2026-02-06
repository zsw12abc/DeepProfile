import { I18nService } from "./I18nService";

export interface ZhihuContent {
  id: string;
  type: "answer" | "article" | "question"; // Added question type
  title: string;
  excerpt: string;
  content: string;
  created_time: number;
  question_id?: string;
  url?: string;
  action_type: "created" | "voted";
  is_relevant?: boolean;
}

export interface UserProfile {
  name: string;
  headline: string;
  url_token: string;
  avatar_url?: string;
}

export interface FetchResult {
  items: ZhihuContent[];
  totalFetched: number;
  totalRelevant: number;
}

export class ZhihuClient {
  private static BASE_URL = "https://www.zhihu.com/api/v4";

  // Removed manual cookie fetching as credentials: 'include' handles it
  private static async getHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      // User-Agent is usually handled by the browser, setting it manually might be blocked in some contexts but keeping for now
      // 'User-Agent': 'Mozilla/5.0 ...',
      // Referrer is often immutable in fetch, but we can try.
      // If this fails, we might need declarativeNetRequest rules.
    };
  }

  static async resolveUserToken(idOrToken: string): Promise<string> {
    if (/^[a-f0-9]{32}$/.test(idOrToken)) {
      try {
        console.log(`Resolving Hash ID via API: ${idOrToken}`);
        const url = `${this.BASE_URL}/members/${idOrToken}?include=url_token`;
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.url_token) {
            console.log(`Resolved ${idOrToken} to ${data.url_token}`);
            return data.url_token;
          }
        }
      } catch (e) {
        console.warn("Failed to resolve user token via API", e);
      }
    }
    return idOrToken;
  }

  static async fetchUserProfile(username: string): Promise<UserProfile | null> {
    const userToken = await this.resolveUserToken(username);
    const url = `${this.BASE_URL}/members/${userToken}?include=avatar_url`;
    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (response.status === 403) {
        console.error(
          "Zhihu API 403 Forbidden. Please check if you are logged in to Zhihu.",
        );
        throw new Error(I18nService.t("error_zhihu_403"));
      }

      if (response.ok) {
        const data = await response.json();
        return {
          name: data.name,
          headline: data.headline,
          url_token: data.url_token,
          avatar_url: data.avatar_url
            ? data.avatar_url.replace("_l", "")
            : data.avatar_url, // Get original size avatar, handle undefined
        };
      }
    } catch (e) {
      console.warn("Failed to fetch user profile", e);
      throw e; // Re-throw to let the UI handle the error message
    }
    return null;
  }

  static async fetchUserContent(
    username: string,
    limit: number = 15,
    context?: string,
  ): Promise<FetchResult> {
    const userToken = await this.resolveUserToken(username);

    const fetchLimit = Math.min(limit * 3, 50);

    const [answers, articles, activities] = await Promise.all([
      this.fetchList(userToken, "answers", fetchLimit),
      this.fetchList(userToken, "articles", fetchLimit),
      this.fetchActivities(userToken, fetchLimit),
    ]);

    // 去重：基于ID移除重复项
    const allItemsMap = new Map<string, ZhihuContent>();
    [...answers, ...articles, ...activities].forEach((item) => {
      if (!allItemsMap.has(item.id.toString())) {
        allItemsMap.set(item.id.toString(), item);
      }
    });
    let combined = Array.from(allItemsMap.values());
    const totalFetched = combined.length;

    if (context && context.length > 1) {
      console.log(`Filtering content by context: "${context}"`);
      combined = this.sortByRelevance(combined, context);
    } else {
      combined.sort((a, b) => b.created_time - a.created_time);
    }

    const totalRelevant = combined.filter((i) => i.is_relevant).length;
    const result = combined.slice(0, limit);

    // 为内容为空的回答获取详细内容
    const enhancedResult = await this.enhanceContent(result);

    console.log(
      `Fetched ${totalFetched} items, returning top ${enhancedResult.length}`,
    );

    return {
      items: enhancedResult,
      totalFetched,
      totalRelevant,
    };
  }

  // 增强内容，为内容为空的回答获取详细内容
  private static async enhanceContent(
    items: ZhihuContent[],
  ): Promise<ZhihuContent[]> {
    // 过滤出内容为空的回答或文章
    const itemsWithEmptyContent = items.filter(
      (item) =>
        (!item.content ||
          item.content.trim() === "" ||
          item.content === "[无正文内容]") &&
        (item.type === "answer" || item.type === "article"),
    );

    console.log(
      `Found ${itemsWithEmptyContent.length} items with empty content to enhance`,
    );

    // 对于内容为空的回答，获取详细内容
    for (const item of itemsWithEmptyContent) {
      try {
        const detailedContent = await this.fetchDetailContent(
          item.id,
          item.type as "answer" | "article",
        );
        if (detailedContent) {
          // 更新原数组中的内容
          const index = items.findIndex((i) => i.id === item.id);
          if (index !== -1) {
            items[index].content = detailedContent;
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch detailed content for ${item.type} ${item.id}:`,
          error,
        );
      }
    }

    return items;
  }

  // 获取单个回答或文章的详细内容
  static async fetchDetailContent(
    id: string,
    type: "answer" | "article",
  ): Promise<string | null> {
    const endpoint = type === "answer" ? "answers" : "articles";
    try {
      const url = `${this.BASE_URL}/${endpoint}/${id}?include=content`;
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch ${type} ${id}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();
      return data.content || null;
    } catch (error) {
      console.error(`Error fetching ${type} ${id}:`, error);
      return null;
    }
  }

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

  private static async fetchList(
    userToken: string,
    type: "answers" | "articles",
    limit: number,
  ): Promise<ZhihuContent[]> {
    // 知乎API参数，包含更多字段
    const url = `${this.BASE_URL}/members/${userToken}/${type}?limit=${limit}&offset=0&sort_by=created&include=data[*].id,data[*].type,data[*].question.title,data[*].question.id,data[*].excerpt,data[*].created_time,has_more`;

    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch ${type}: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data = await response.json();

      // 调试输出API响应
      console.log(`API Response for ${type}:`, data);

      return (data.data || []).map((item: any) => ({
        id: item.id,
        type: item.type, // 'answer' or 'article'
        title: item.question?.title || item.title || "无标题",
        excerpt: item.excerpt || "",
        content: item.excerpt || "", // 先用excerpt作为content，后续会增强
        created_time: item.created_time,
        question_id: item.question?.id,
        url:
          item.type === "answer"
            ? `https://www.zhihu.com/question/${item.question?.id}/answer/${item.id}`
            : `https://zhuanlan.zhihu.com/p/${item.id}`,
        action_type: "created",
      }));
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      return [];
    }
  }

  private static async fetchActivities(
    userToken: string,
    limit: number,
  ): Promise<ZhihuContent[]> {
    const url = `${this.BASE_URL}/members/${userToken}/activities?limit=${limit}&include=data[*].verb,data[*].target.id,data[*].target.type,data[*].target.question.title,data[*].target.question.id,data[*].target.excerpt,data[*].target.title,data[*].created_time`;
    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (!response.ok) return [];

      const data = await response.json();
      console.log("Fetched activities:", data); // 调试输出

      return (data.data || [])
        .filter(
          (item: any) =>
            item.verb === "MEMBER_VOTEUP_ANSWER" ||
            item.verb === "MEMBER_VOTEUP_ARTICLE",
        )
        .map((item: any) => ({
          id: item.target.id,
          type: item.target.type,
          title: item.target.question?.title || item.target.title || "无标题",
          excerpt: item.target.excerpt || "",
          content: item.target.excerpt || "", // 先用excerpt，后续可能增强
          created_time: item.created_time,
          question_id: item.target.question?.id,
          url:
            item.target.type === "answer"
              ? `https://www.zhihu.com/question/${item.target.question?.id}/answer/${item.target.id}`
              : `https://zhuanlan.zhihu.com/p/${item.target.id}`,
          action_type: "voted",
        }));
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      return [];
    }
  }

  static cleanContentData(
    items: ZhihuContent[],
    userProfile?: UserProfile | null,
  ): string {
    let text = "";
    if (userProfile) {
      text += `User Nickname: ${userProfile.name}\nUser Headline: ${userProfile.headline}\n\n`;
    }

    if (!items || items.length === 0)
      return text + "This user has no public answers or articles.";

    const relevantItems = items.filter((item) => item.is_relevant);
    let otherItems = items.filter((item) => !item.is_relevant);

    if (relevantItems.length >= 3) {
      console.log(
        `Found ${relevantItems.length} relevant items. Trimming noise.`,
      );
      otherItems = otherItems.slice(0, 3);
    }

    const formatItem = (item: ZhihuContent) => {
      // 优先使用完整内容，如果没有则使用摘要
      let content = item.content || item.excerpt || "";
      if (content) {
        content = this.stripHtml(content);
        // 增加内容长度以捕获更多有意义的内容
        content = content.slice(0, 1000);
      } else {
        content = "[No Content]"; // 如果真的没有内容，则标记
      }

      const actionTag =
        item.action_type === "voted" ? "【Upvoted】" : "【Original】";
      const typeTag =
        item.type === "answer"
          ? "【Answer】"
          : item.type === "article"
            ? "【Article】"
            : "【Activity】";

      return `[ID:${item.id}] ${actionTag}${typeTag} Title: 【${item.title}】\nContent: ${content}`;
    };

    let contentText = "";
    if (relevantItems.length > 0) {
      contentText += "--- RELEVANT CONTENT (★ Key Analysis) ---\n";
      contentText += relevantItems.map(formatItem).join("\n\n");
      contentText += "\n\n";
    }

    if (otherItems.length > 0) {
      contentText +=
        "--- OTHER RECENT CONTENT (For Personality Reference Only) ---\n";
      contentText += otherItems.map(formatItem).join("\n\n");
    }

    return text + contentText;
  }

  private static stripHtml(html: string): string {
    if (!html) return "";
    // Replace <br> and <p> with newlines to preserve paragraph structure
    let text = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n");
    // Strip other tags
    text = text.replace(/<[^>]*>?/gm, "");
    // Decode entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    // Collapse multiple newlines
    return text.replace(/\n\s*\n/g, "\n").trim();
  }

  // --- New Feature: Fetch Hot List ---
  static async fetchHotList(): Promise<string[]> {
    const url =
      "https://www.zhihu.com/api/v3/feed/topstory/hot-list?limit=50&desktop=true";
    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (!response.ok) {
        console.error(`Failed to fetch hot list: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((item: any) => {
          const title =
            item.target?.title || item.target?.question?.title || "";
          const excerpt = item.target?.excerpt || "";
          return `Title: ${title}\nExcerpt: ${excerpt.substring(0, 100)}`;
        });
      }
      return [];
    } catch (e) {
      console.error("Error fetching hot list:", e);
      return [];
    }
  }

  // --- Helper: Fetch Image as Base64 ---
  static async fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to convert image to base64:", e);
      return null;
    }
  }

  // --- New Feature: Fetch Answer Content for Context ---
  static async fetchAnswerContentForContext(
    answerId: string,
  ): Promise<string | null> {
    return this.fetchDetailContent(answerId, "answer");
  }
}

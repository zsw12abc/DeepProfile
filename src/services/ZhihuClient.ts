export interface ZhihuContent {
  id: string;
  type: 'answer' | 'article';
  title: string;
  excerpt: string;
  content: string;
  created_time: number;
  question_id?: string; // Added question_id for constructing proper URLs
}

export interface UserProfile {
  name: string;
  headline: string;
  url_token: string;
}

export class ZhihuClient {
  private static BASE_URL = 'https://www.zhihu.com/api/v4';

  static async resolveUserToken(idOrToken: string): Promise<string> {
    if (/^[a-f0-9]{32}$/.test(idOrToken)) {
      try {
        console.log(`Resolving Hash ID via API: ${idOrToken}`);
        const url = `${this.BASE_URL}/members/${idOrToken}?include=url_token`;
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.url_token) {
            console.log(`Resolved ${idOrToken} to ${data.url_token}`);
            return data.url_token;
          }
        }
      } catch (e) {
        console.warn('Failed to resolve user token via API', e);
      }
    }
    return idOrToken;
  }

  static async fetchUserProfile(username: string): Promise<UserProfile | null> {
    const userToken = await this.resolveUserToken(username);
    const url = `${this.BASE_URL}/members/${userToken}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          name: data.name,
          headline: data.headline,
          url_token: data.url_token
        };
      }
    } catch (e) {
      console.warn('Failed to fetch user profile', e);
    }
    return null;
  }

  /**
   * Fetches user answers and articles directly.
   */
  static async fetchUserContent(username: string): Promise<ZhihuContent[]> {
    const userToken = await this.resolveUserToken(username);
    
    // Fetch answers and articles in parallel
    const [answers, articles] = await Promise.all([
      this.fetchList(userToken, 'answers'),
      this.fetchList(userToken, 'articles')
    ]);

    const combined = [...answers, ...articles];
    // Sort by created time desc
    combined.sort((a, b) => b.created_time - a.created_time);
    
    console.log(`Fetched ${combined.length} items (${answers.length} answers, ${articles.length} articles) for ${username}`);
    return combined;
  }

  private static async fetchList(userToken: string, type: 'answers' | 'articles'): Promise<ZhihuContent[]> {
    const url = `${this.BASE_URL}/members/${userToken}/${type}?limit=10&sort_by=created`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || []).map((item: any) => ({
        id: item.id,
        type: item.type, // 'answer' or 'article'
        title: item.question?.title || item.title || '无标题',
        excerpt: item.excerpt || '',
        content: item.content || '',
        created_time: item.created_time,
        question_id: item.question?.id // Extract question ID
      }));
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      return [];
    }
  }

  static cleanContentData(items: ZhihuContent[], userProfile?: UserProfile | null): string {
    let text = '';
    if (userProfile) {
      text += `用户昵称：${userProfile.name}\n用户签名：${userProfile.headline}\n\n`;
    }

    if (!items || items.length === 0) return text + '该用户暂无公开回答或文章。';

    const contentText = items
      .slice(0, 15) // Limit to top 15 items
      .map(item => {
        let content = item.excerpt;
        if (!content && item.content) {
          content = this.stripHtml(item.content);
        }
        content = content.slice(0, 200);
        // Embed ID for LLM to reference
        return `[ID:${item.id}] 【${item.title}】\n${content}`;
      })
      .join('\n\n');
    
    return text + contentText;
  }

  private static stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  }
}

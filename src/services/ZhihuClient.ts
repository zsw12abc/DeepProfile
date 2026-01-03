export interface ZhihuActivity {
  id: string;
  verb: string;
  target: {
    id: string;
    type: string; // 'answer', 'article', etc.
    question?: {
      title: string;
    };
    title?: string; // for articles
    content?: string; // HTML content
    excerpt?: string;
    url: string;
  };
}

export class ZhihuClient {
  private static BASE_URL = 'https://www.zhihu.com/api/v4';

  /**
   * Fetches user activities from Zhihu API.
   * Note: This should ideally be called from a background script to handle cookies/CORS.
   */
  static async fetchUserActivities(username: string): Promise<ZhihuActivity[]> {
    // In a real extension, we might need to resolve username to user_id first if it's not the id.
    // For now, we assume username is the url_token (e.g., 'zhang-san').
    
    const url = `${this.BASE_URL}/members/${username}/activities?limit=20`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // These headers are usually automatically handled by the browser if the extension has permissions
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Zhihu API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data as ZhihuActivity[];
    } catch (error) {
      console.error('Failed to fetch Zhihu activities:', error);
      throw error;
    }
  }

  /**
   * Cleans and formats activity data into a single string for LLM analysis.
   */
  static cleanActivityData(activities: ZhihuActivity[]): string {
    return activities
      .filter(item => item.verb === 'ANSWER_CREATE' || item.verb === 'MEMBER_CREATE_ARTICLE')
      .map(item => {
        const title = item.target.question?.title || item.target.title || '无标题';
        // Prefer excerpt if available, otherwise strip HTML from content
        let content = item.target.excerpt || '';
        
        if (!content && item.target.content) {
          content = this.stripHtml(item.target.content);
        }

        // Limit content length per item to avoid token overflow
        content = content.slice(0, 200);

        return `【${title}】\n${content}`;
      })
      .join('\n\n');
  }

  private static stripHtml(html: string): string {
    // Simple regex to strip HTML tags. 
    // In a browser environment, DOMParser is better, but this works in Node/Test too.
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  }
}

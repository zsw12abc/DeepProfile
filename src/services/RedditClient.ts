import type { ZhihuContent, UserProfile } from "./ZhihuClient";

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  created_utc: number;
  score: number;
  subreddit: string;
  author: string;
  permalink: string;
}

export interface RedditUser {
  name: string;
  created_utc: number;
  comment_karma: number;
  link_karma: number;
  subreddit?: {
    public_description: string;
  };
}

export interface FetchResult {
  items: ZhihuContent[];
  totalFetched: number;
  totalRelevant: number;
}

export class RedditClient {
  private static BASE_URL = 'https://oauth.reddit.com';
  private static BASE_API_URL = 'https://api.reddit.com';

  static async fetchUserProfile(username: string): Promise<UserProfile | null> {
    try {
      const url = `${this.BASE_API_URL}/user/${username}/about`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return {
          name: data.data.name,
          headline: data.data.subreddit?.public_description || `Reddit user with ${data.data.comment_karma} comment karma`,
          url_token: data.data.name
        };
      }
    } catch (e) {
      console.warn('Failed to fetch Reddit user profile', e);
    }
    return null;
  }

  static async fetchUserContent(username: string, limit: number = 15, context?: string): Promise<FetchResult> {
    try {
      // Fetch user's posts and comments
      const postsUrl = `${this.BASE_URL}/user/${username}/submitted.json?limit=${limit * 2}`;
      const commentsUrl = `${this.BASE_URL}/user/${username}/comments.json?limit=${limit * 2}`;
      
      const [postsResponse, commentsResponse] = await Promise.all([
        fetch(postsUrl),
        fetch(commentsUrl)
      ]);

      let posts: RedditPost[] = [];
      let comments: RedditPost[] = [];

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        posts = postsData.data?.children?.map((child: any) => child.data) || [];
      }

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        comments = commentsData.data?.children?.map((child: any) => child.data) || [];
      }

      // Combine and convert to ZhihuContent format
      const allContent = [...posts, ...comments].slice(0, limit * 2);
      const convertedContent = allContent.map(item => this.convertToZhihuContent(item));
      
      let combined = convertedContent;
      const totalFetched = combined.length;
      
      if (context && context.length > 1) {
        console.log(`Filtering content by context: "${context}"`);
        combined = this.sortByRelevance(combined, context);
      } else {
        combined.sort((a, b) => b.created_time - a.created_time);
      }

      const totalRelevant = combined.filter(i => i.is_relevant).length;
      const result = combined.slice(0, limit);
      
      console.log(`Fetched ${totalFetched} items, returning top ${result.length}`);
      
      return {
        items: result,
        totalFetched,
        totalRelevant
      };
    } catch (error) {
      console.error('Failed to fetch Reddit content:', error);
      return {
        items: [],
        totalFetched: 0,
        totalRelevant: 0
      };
    }
  }

  private static convertToZhihuContent(redditItem: RedditPost): ZhihuContent {
    // Use full selftext (Reddit post content) instead of just a 200-char excerpt
    const fullContent = redditItem.selftext || redditItem.title || '';
    
    return {
      id: redditItem.id,
      type: redditItem.selftext ? 'article' : 'answer',
      title: redditItem.title || `Comment in r/${redditItem.subreddit}`,
      excerpt: fullContent.substring(0, 200), // First 200 chars as excerpt
      content: fullContent, // Full content for analysis
      created_time: redditItem.created_utc,
      url: `https://www.reddit.com${redditItem.permalink}`,
      action_type: 'created'
    };
  }

  private static sortByRelevance(items: ZhihuContent[], context: string): ZhihuContent[] {
    const keywords = context.split('|').map(s => s.trim().toLowerCase()).filter(s => s.length > 1);
    
    const titlePart = keywords[0] || "";
    const bigrams = new Set<string>();
    for (let i = 0; i < titlePart.length - 1; i++) {
      bigrams.add(titlePart.substring(i, i + 2));
    }

    const getScore = (item: ZhihuContent) => {
      const text = (item.title + item.excerpt).toLowerCase();
      let score = 0;
      
      let keywordMatches = 0;
      keywords.forEach(kw => {
        if (text.includes(kw)) keywordMatches++;
      });
      score += keywordMatches * 500;

      let bigramMatches = 0;
      bigrams.forEach(bg => {
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

      if (item.action_type === 'created') score += 5;

      return score;
    };

    return items.sort((a, b) => getScore(b) - getScore(a));
  }
}
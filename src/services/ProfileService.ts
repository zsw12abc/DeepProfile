import { ZhihuClient } from "./ZhihuClient";
import { RedditClient } from "./RedditClient";
import type { ZhihuContent, UserProfile } from "./ZhihuClient";
import { ConfigService } from "./ConfigService";
import type { SupportedPlatform } from "~types";
import { LabelService } from "./LabelService";

export interface FetchResult {
  items: ZhihuContent[];
  totalFetched: number;
  totalRelevant: number;
  platform: SupportedPlatform;
}

export class ProfileService {
  static async fetchUserContent(
    platform: SupportedPlatform,
    userId: string,
    limit: number = 15,
    context?: string
  ): Promise<FetchResult> {
    switch (platform) {
      case 'zhihu':
        const zhihuResult = await ZhihuClient.fetchUserContent(userId, limit, context);
        return {
          ...zhihuResult,
          platform: 'zhihu'
        };
      case 'reddit':
        const redditResult = await RedditClient.fetchUserContent(userId, limit, context);
        return {
          ...redditResult,
          platform: 'reddit'
        };
      case 'twitter':
      case 'weibo':
      default:
        throw new Error(`Platform ${platform} is not implemented yet`);
    }
  }

  static async fetchUserProfile(
    platform: SupportedPlatform,
    userId: string
  ): Promise<UserProfile | null> {
    switch (platform) {
      case 'zhihu':
        return await ZhihuClient.fetchUserProfile(userId);
      case 'reddit':
        return await RedditClient.fetchUserProfile(userId);
      case 'twitter':
      case 'weibo':
      default:
        throw new Error(`Platform ${platform} is not implemented yet`);
    }
  }

  static async identifyPlatform(url: string): Promise<SupportedPlatform | null> {
    const config = await ConfigService.getConfig();
    
    if (url.includes('zhihu.com') && config.enabledPlatforms.zhihu) {
      return 'zhihu';
    } else if (url.includes('reddit.com') && config.enabledPlatforms.reddit) {
      return 'reddit';
    } else if (url.includes('twitter.com') && config.enabledPlatforms.twitter) {
      return 'twitter';
    } else if (url.includes('weibo.com') && config.enabledPlatforms.weibo) {
      return 'weibo';
    }
    
    return null;
  }

  static cleanContentData(
    platform: SupportedPlatform,
    items: ZhihuContent[],
    userProfile?: UserProfile | null
  ): string {
    let text = `Platform: ${platform}\n`;
    
    if (userProfile) {
      text += `User Nickname: ${userProfile.name}\nUser Headline: ${userProfile.headline}\n\n`;
    }

    if (!items || items.length === 0) {
      switch (platform) {
        case 'zhihu':
          text += 'This user has no public answers or articles.';
          break;
        case 'reddit':
          text += 'This user has no public posts or comments.';
          break;
        case 'twitter':
        case 'weibo':
        default:
          text += 'This user has no public content.';
          break;
      }
      return text;
    }

    const relevantItems = items.filter(item => item.is_relevant);
    let otherItems = items.filter(item => !item.is_relevant);

    // --- Aggressive Filtering Strategy ---
    // If we have enough relevant items (e.g. >= 3), we drastically reduce the noise.
    // We only keep a few "other" items to give a hint of general personality, 
    // but not enough to overwhelm the topic classification.
    if (relevantItems.length >= 3) {
        console.log(`Found ${relevantItems.length} relevant items. Trimming noise.`);
        // Keep max 3 other items just for personality context
        otherItems = otherItems.slice(0, 3);
    }

    const formatItem = (item: ZhihuContent) => {
        // Prefer full content, strip HTML, and take a longer slice (e.g. 1000 chars to capture more of the answer)
        let content = '';
        if (item.content) {
          content = this.stripHtml(item.content);
        } else {
          content = item.excerpt || '';
        }
        
        // Increase content length to capture more meaningful content
        content = content.slice(0, 1000); 
        
        const actionTag = item.action_type === 'voted' ? '【Upvoted】' : '【Original】';
        let typeTag = '';
        
        if (platform === 'zhihu') {
            typeTag = item.type === 'answer' ? '【Answer】' : (item.type === 'article' ? '【Article】' : '【Activity】');
        } else if (platform === 'reddit') {
            typeTag = item.type === 'article' ? '【Post】' : '【Comment】';
        }
        
        return `[ID:${item.id}] ${actionTag}${typeTag} Title: 【${item.title}】\nContent: ${content}`;
    };

    let contentText = '';
    if (relevantItems.length > 0) {
        contentText += '--- RELEVANT CONTENT (★ Key Analysis) ---\n';
        contentText += relevantItems.map(formatItem).join('\n\n');
        contentText += '\n\n';
    }

    if (otherItems.length > 0) {
        contentText += '--- OTHER RECENT CONTENT (For Personality Reference Only) ---\n';
        contentText += otherItems.map(formatItem).join('\n\n');
    }
    
    return text + contentText;
  }

  private static stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  }
  
  // 使用标准化标签系统分析用户内容
  static async analyzeWithStandardLabels(
    content: string,
    topicClassification: string
  ) {
    const labelService = LabelService.getInstance();
    return labelService.analyzeContentWithStandardLabels(content, topicClassification);
  }
}

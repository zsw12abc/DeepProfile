import { ZhihuClient } from "./ZhihuClient";
import { RedditClient } from "./RedditClient";
import { TwitterClient } from "./TwitterClient";
import { QuoraClient } from "./QuoraClient";
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

interface CleanContentOptions {
  redactSensitive?: boolean;
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
        const twitterResult = await TwitterClient.fetchUserContent(userId, limit, context);
        return {
          ...twitterResult,
          platform: 'twitter'
        };
      case 'quora':
        const quoraResult = await QuoraClient.fetchUserContent(userId, limit, context);
        return {
          ...quoraResult,
          platform: 'quora'
        };
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
        return await TwitterClient.fetchUserProfile(userId);
      case 'quora':
        return await QuoraClient.fetchUserProfile(userId);
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
    } else if ((url.includes('twitter.com') || url.includes('x.com')) && config.enabledPlatforms.twitter) {
      return 'twitter';
    } else if (url.includes('quora.com') && config.enabledPlatforms.quora) {
      return 'quora';
    } else if (url.includes('weibo.com') && config.enabledPlatforms.weibo) {
      return 'weibo';
    }
    
    return null;
  }

  static cleanContentData(
    platform: SupportedPlatform,
    items: ZhihuContent[],
    userProfile?: UserProfile | null,
    options: CleanContentOptions = {}
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
          text += 'This user has no public tweets or replies.';
          break;
        case 'quora':
          text += 'This user has no public answers or questions.';
          break;
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
        
        // 增加敏感内容过滤（可配置）
        if (options.redactSensitive) {
          content = this.filterSensitiveContent(content);
        }
        
        // Increase content length to capture more meaningful content
        content = content.slice(0, 1000); 
        
        const actionTag = item.action_type === 'voted' ? '【Upvoted】' : '【Original】';
        let typeTag = '';
        
        if (platform === 'zhihu') {
            typeTag = item.type === 'answer' ? '【Answer】' : (item.type === 'article' ? '【Article】' : '【Activity】');
        } else if (platform === 'reddit') {
            typeTag = item.type === 'article' ? '【Post】' : '【Comment】';
        } else if (platform === 'twitter') {
            typeTag = item.type === 'article' ? '【Tweet】' : '【Reply】';
        } else if (platform === 'quora') {
            typeTag = item.type === 'answer' ? '【Answer】' : '【Question】';
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
  
  // 敏感内容过滤函数，移除或替换可能触发AI安全过滤的词汇
  private static filterSensitiveContent(content: string): string {
    if (!content) return content;
    
    // 仅对高风险内容进行替换，避免过度削弱语义
    const sensitivePatterns = [
      // 自伤/自杀
      /自杀|自残/gi,
      /\b(suicide|self-harm|self harm)\b/gi,
      // 暴力与恐怖活动
      /恐怖主义|恐怖袭击/gi,
      /\b(terrorism|terrorist)\b/gi,
      /爆炸物|炸弹/gi,
      /\b(explosive|bomb)\b/gi,
      /枪支|枪械/gi,
      /\b(firearm|gun)\b/gi,
      /屠杀|大屠杀/gi,
      /\b(genocide|massacre)\b/gi,
      /谋杀|杀人|杀害/gi,
      /\b(murder|homicide)\b/gi,
      // 性暴力/儿童性剥削
      /强奸|性侵/gi,
      /\b(rape|sexual assault)\b/gi,
      /儿童色情/gi,
      /\b(child porn|child pornography)\b/gi,
      // 毒品与制毒贩毒
      /毒品|制毒|贩毒/gi,
      /\b(drug trafficking|cocaine|heroin|meth)\b/gi
    ];
    
    let filteredContent = content;
    for (const pattern of sensitivePatterns) {
      // 将敏感词替换为中性词汇或删除
      filteredContent = filteredContent.replace(pattern, '[REDACTED]');
    }
    
    return filteredContent;
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

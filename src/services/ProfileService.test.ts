import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService, type FetchResult } from './ProfileService';
import { ZhihuClient } from './ZhihuClient';
import { RedditClient } from './RedditClient';
import { ConfigService } from './ConfigService';
import { LabelService } from './LabelService';
import type { ZhihuContent, UserProfile } from './ZhihuClient';
import type { SupportedPlatform } from '~types';

// Mock all dependencies
vi.mock('./ZhihuClient', () => ({
  ZhihuClient: {
    fetchUserContent: vi.fn(),
    fetchUserProfile: vi.fn(),
    stripHtml: vi.fn((html) => html.replace(/<[^>]*>?/gm, '')),
  },
}));

vi.mock('./RedditClient', () => ({
  RedditClient: {
    fetchUserContent: vi.fn(),
    fetchUserProfile: vi.fn(),
  },
}));

vi.mock('./ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
  },
}));

vi.mock('./LabelService', () => ({
  LabelService: {
    getInstance: vi.fn(() => ({
      analyzeContentWithStandardLabels: vi.fn(),
    })),
  },
}));

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchUserContent', () => {
    it('should fetch content from Zhihu platform', async () => {
      const mockZhihuResult: FetchResult = {
        items: [{ id: '1', title: 'Test Post', content: 'Test content', is_relevant: true, action_type: 'created', type: 'answer' }],
        totalFetched: 1,
        totalRelevant: 1,
        platform: 'zhihu',
      };
      
      vi.spyOn(ZhihuClient, 'fetchUserContent').mockResolvedValue({
        items: [{ id: '1', title: 'Test Post', content: 'Test content', is_relevant: true, action_type: 'created', type: 'answer' }],
        totalFetched: 1,
        totalRelevant: 1,
      });

      const result = await ProfileService.fetchUserContent('zhihu', 'test-user', 10);

      expect(result).toEqual(mockZhihuResult);
      expect(ZhihuClient.fetchUserContent).toHaveBeenCalledWith('test-user', 10, undefined);
    });

    it('should fetch content from Reddit platform', async () => {
      const mockRedditResult: FetchResult = {
        items: [{ id: '2', title: 'Test Post', content: 'Test content', is_relevant: true, action_type: 'created', type: 'post' }],
        totalFetched: 1,
        totalRelevant: 1,
        platform: 'reddit',
      };
      
      vi.spyOn(RedditClient, 'fetchUserContent').mockResolvedValue({
        items: [{ id: '2', title: 'Test Post', content: 'Test content', is_relevant: true, action_type: 'created', type: 'post' }],
        totalFetched: 1,
        totalRelevant: 1,
      });

      const result = await ProfileService.fetchUserContent('reddit', 'test-user', 10);

      expect(result).toEqual(mockRedditResult);
      expect(RedditClient.fetchUserContent).toHaveBeenCalledWith('test-user', 10, undefined);
    });

    it('should throw error for unimplemented platforms', async () => {
      await expect(ProfileService.fetchUserContent('twitter', 'test-user', 10))
        .rejects
        .toThrow('Platform twitter is not implemented yet');
    });
  });

  describe('fetchUserProfile', () => {
    it('should fetch profile from Zhihu', async () => {
      const mockProfile: UserProfile = {
        id: 'test-user',
        name: 'Test User',
        headline: 'Test headline',
        avatar_url: 'https://example.com/avatar.jpg',
        follower_count: 100,
        answer_count: 50,
        agree_count: 1000,
        thank_count: 200,
      };

      vi.spyOn(ZhihuClient, 'fetchUserProfile').mockResolvedValue(mockProfile);

      const result = await ProfileService.fetchUserProfile('zhihu', 'test-user');

      expect(result).toEqual(mockProfile);
      expect(ZhihuClient.fetchUserProfile).toHaveBeenCalledWith('test-user');
    });

    it('should fetch profile from Reddit', async () => {
      const mockProfile: UserProfile = {
        id: 'test-user',
        name: 'Test User',
        headline: 'Test headline',
        avatar_url: 'https://example.com/avatar.jpg',
        follower_count: 100,
        answer_count: 50,
        agree_count: 1000,
        thank_count: 200,
      };

      vi.spyOn(RedditClient, 'fetchUserProfile').mockResolvedValue(mockProfile);

      const result = await ProfileService.fetchUserProfile('reddit', 'test-user');

      expect(result).toEqual(mockProfile);
      expect(RedditClient.fetchUserProfile).toHaveBeenCalledWith('test-user');
    });

    it('should throw error for unimplemented platforms', async () => {
      await expect(ProfileService.fetchUserProfile('twitter', 'test-user'))
        .rejects
        .toThrow('Platform twitter is not implemented yet');
    });
  });

  describe('identifyPlatform', () => {
    it('should identify Zhihu platform from URL', async () => {
      vi.spyOn(ConfigService, 'getConfig').mockResolvedValue({
        enabledPlatforms: { zhihu: true, reddit: false, twitter: false, weibo: false },
      } as any);

      const result = await ProfileService.identifyPlatform('https://www.zhihu.com/people/test-user');

      expect(result).toBe('zhihu');
    });

    it('should identify Reddit platform from URL', async () => {
      vi.spyOn(ConfigService, 'getConfig').mockResolvedValue({
        enabledPlatforms: { zhihu: false, reddit: true, twitter: false, weibo: false },
      } as any);

      const result = await ProfileService.identifyPlatform('https://www.reddit.com/user/test-user');

      expect(result).toBe('reddit');
    });

    it('should return null if platform is not enabled', async () => {
      vi.spyOn(ConfigService, 'getConfig').mockResolvedValue({
        enabledPlatforms: { zhihu: false, reddit: false, twitter: false, weibo: false },
      } as any);

      const result = await ProfileService.identifyPlatform('https://www.zhihu.com/people/test-user');

      expect(result).toBeNull();
    });

    it('should return null for unrecognized URL', async () => {
      vi.spyOn(ConfigService, 'getConfig').mockResolvedValue({
        enabledPlatforms: { zhihu: true, reddit: true, twitter: true, weibo: true },
      } as any);

      const result = await ProfileService.identifyPlatform('https://www.unknown.com/user/test-user');

      expect(result).toBeNull();
    });
  });

  describe('cleanContentData', () => {
    it('should format content for Zhihu platform with user profile', () => {
      const mockItems: ZhihuContent[] = [
        {
          id: '1',
          title: 'Test Question',
          content: '<p>This is a test <strong>content</strong>.</p>',
          is_relevant: true,
          action_type: 'created',
          type: 'answer',
          excerpt: 'This is excerpt'
        }
      ];
      
      const mockProfile: UserProfile = {
        id: 'test-user',
        name: 'Test User',
        headline: 'Software Engineer',
        avatar_url: 'https://example.com/avatar.jpg',
        follower_count: 100,
        answer_count: 50,
        agree_count: 1000,
        thank_count: 200,
      };

      const result = ProfileService.cleanContentData('zhihu', mockItems, mockProfile);

      expect(result).toContain('平台: zhihu');
      expect(result).toContain('用户昵称：Test User');
      expect(result).toContain('用户签名：Software Engineer');
      expect(result).toContain('【原创】【回答】');
      expect(result).toContain('Test Question');
    });

    it('should format content for Zhihu platform without user profile', () => {
      const mockItems: ZhihuContent[] = [
        {
          id: '1',
          title: 'Test Question',
          content: '<p>This is a test <strong>content</strong>.</p>',
          is_relevant: true,
          action_type: 'created',
          type: 'answer',
          excerpt: 'This is excerpt'
        }
      ];

      const result = ProfileService.cleanContentData('zhihu', mockItems);

      expect(result).toContain('平台: zhihu');
      expect(result).not.toContain('用户昵称');
      expect(result).not.toContain('用户签名');
    });

    it('should format content for Reddit platform', () => {
      const mockItems: ZhihuContent[] = [
        {
          id: '2',
          title: 'Test Post',
          content: 'This is a test content.',
          is_relevant: true,
          action_type: 'created',
          type: 'post',
          excerpt: 'This is excerpt'
        }
      ];

      const result = ProfileService.cleanContentData('reddit', mockItems);

      expect(result).toContain('平台: reddit');
    });

    it('should handle empty items', () => {
      const result = ProfileService.cleanContentData('zhihu', []);

      expect(result).toContain('该用户暂无公开回答或文章。');
    });
  });

  describe('analyzeWithStandardLabels', () => {
    it('should call LabelService to analyze content with standard labels', async () => {
      const mockLabelService = {
        analyzeContentWithStandardLabels: vi.fn().mockResolvedValue({ test: 'result' }),
      };
      vi.spyOn(LabelService, 'getInstance').mockReturnValue(mockLabelService as any);

      const result = await ProfileService.analyzeWithStandardLabels('test content', 'technology');

      expect(LabelService.getInstance).toHaveBeenCalled();
      expect(mockLabelService.analyzeContentWithStandardLabels).toHaveBeenCalledWith('test content', 'technology');
    });
  });
});
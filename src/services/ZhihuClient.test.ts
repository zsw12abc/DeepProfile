import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZhihuClient, type ZhihuContent } from './ZhihuClient';

// Mock I18nService
vi.mock('./I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    setLanguage: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

describe('ZhihuClient', () => {
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    fetchMock.mockClear();
    vi.clearAllMocks();
  });

  describe('fetchUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      // Mock resolveUserToken to return the token itself for simplicity
      const originalResolveUserToken = ZhihuClient.resolveUserToken;
      vi.spyOn(ZhihuClient, 'resolveUserToken').mockResolvedValue('testuser');

      // Mock fetchUserProfile
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test User',
          headline: 'Headline',
          url_token: 'testuser',
          avatar_url: 'http://example.com/avatar_l.jpg' // This will be processed by replace('_l', '')
        })
      });

      const profile = await ZhihuClient.fetchUserProfile('testuser');
      
      expect(profile).toEqual({
        name: 'Test User',
        headline: 'Headline',
        url_token: 'testuser',
        avatar_url: 'http://example.com/avatar.jpg' // Avatar URL should have '_l' replaced with ''
      });
      
      // Restore original method
      (ZhihuClient.resolveUserToken as any).mockRestore();
    });

    it('should throw error on network failure', async () => {
      vi.spyOn(ZhihuClient, 'resolveUserToken').mockResolvedValue('testuser');
      
      fetchMock.mockRejectedValue(new Error('Network error'));
      
      await expect(ZhihuClient.fetchUserProfile('testuser')).rejects.toThrow('Network error');
      
      // Restore original method
      (ZhihuClient.resolveUserToken as any).mockRestore();
    });
  });

  describe('fetchUserContent', () => {
    it('should fetch user content successfully', async () => {
      // Mock resolveUserToken
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url_token: 'testuser' })
      });

      // Mock answers response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '1',
              type: 'answer',
              question: { title: 'Question 1', id: 'q1' },
              excerpt: 'Answer 1',
              created_time: 1000,
              url: 'http://zhihu.com/answer/1',
              voteup_count: 10,
              comment_count: 5
            },
            {
              id: '3',
              type: 'answer',
              question: { title: 'Question 2', id: 'q2' },
              excerpt: 'Answer 3',
              created_time: 3000,
              url: 'http://zhihu.com/answer/3',
              voteup_count: 20,
              comment_count: 8
            }
          ],
          paging: { is_end: true }
        })
      });

      // Mock articles response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '2',
              type: 'article',
              title: 'Article 1',
              excerpt: 'Article Content',
              created_time: 2000,
              url: 'http://zhihu.com/article/2',
              voteup_count: 15,
              comment_count: 3
            }
          ],
          paging: { is_end: true }
        })
      });

      // Mock activities response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          paging: { is_end: true }
        })
      });
      
      const result = await ZhihuClient.fetchUserContent('testuser');
      
      expect(result.items).toHaveLength(2); // 2 answers (articles and activities are separate calls)
      expect(result.totalFetched).toBe(2);
    });
  });

  describe('cleanContentData', () => {
    it('should filter and format answers correctly', () => {
      const mockContent: ZhihuContent[] = [
        {
          id: '101',
          type: 'answer',
          title: '如何评价 DeepSeek？',
          excerpt: 'DeepSeek 是一家非常有潜力的 AI 公司...',
          content: 'DeepSeek 是一家非常有潜力的 AI 公司...',
          created_time: 1234567890,
          url: 'http://zhihu.com/answer/101',
          action_type: 'created',
          is_relevant: true,
        },
        {
          id: '102',
          type: 'answer',
          title: 'Ignored Question',
          excerpt: 'Ignored content',
          content: 'Ignored content',
          created_time: 1234567890,
          url: 'http://zhihu.com/answer/102',
          action_type: 'voted',
          is_relevant: false,
        },
        {
          id: '103',
          type: 'article',
          title: 'AI 发展趋势',
          excerpt: '未来 AI 将<strong>改变世界</strong>。',
          content: '<p>未来 AI 将<strong>改变世界</strong>。</p>',
          created_time: 1234567890,
          url: 'http://zhihu.com/article/103',
          action_type: 'created',
          is_relevant: true,
        },
      ];

      const result = ZhihuClient.cleanContentData(mockContent);

      expect(result).toContain('【如何评价 DeepSeek？】');
      expect(result).toContain('DeepSeek 是一家非常有潜力的 AI 公司');
      expect(result).toContain('【AI 发展趋势】');
      expect(result).toContain('未来 AI 将改变世界'); // HTML tags stripped
    });

    it('should handle empty data', () => {
      const result = ZhihuClient.cleanContentData([]);
      expect(result).toContain('no public answers or articles');
    });
  });
});
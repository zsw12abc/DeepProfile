import { describe, it, expect, vi } from 'vitest';
import { ZhihuClient, type ZhihuActivity } from './ZhihuClient';

// Mock relative imports
vi.mock('./I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
    init: vi.fn(),
    setLanguage: vi.fn(),
    getLanguage: () => 'zh-CN',
  }
}));

describe('ZhihuClient', () => {
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

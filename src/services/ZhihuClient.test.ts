import { describe, it, expect } from 'vitest';
import { ZhihuClient, type ZhihuActivity } from './ZhihuClient';

describe('ZhihuClient', () => {
  describe('cleanActivityData', () => {
    it('should filter and format answers correctly', () => {
      const mockActivities: ZhihuActivity[] = [
        {
          id: '1',
          verb: 'ANSWER_CREATE',
          target: {
            id: '101',
            type: 'answer',
            question: { title: '如何评价 DeepSeek？' },
            excerpt: 'DeepSeek 是一家非常有潜力的 AI 公司...',
            url: 'http://zhihu.com/answer/101',
          },
        },
        {
          id: '2',
          verb: 'MEMBER_VOTEUP_ANSWER', // Should be ignored
          target: {
            id: '102',
            type: 'answer',
            question: { title: 'Ignored Question' },
            excerpt: 'Ignored content',
            url: 'http://zhihu.com/answer/102',
          },
        },
        {
          id: '3',
          verb: 'MEMBER_CREATE_ARTICLE',
          target: {
            id: '103',
            type: 'article',
            title: 'AI 发展趋势',
            content: '<p>未来 AI 将<strong>改变世界</strong>。</p>',
            url: 'http://zhihu.com/article/103',
          },
        },
      ];

      const result = ZhihuClient.cleanActivityData(mockActivities);

      expect(result).toContain('【如何评价 DeepSeek？】');
      expect(result).toContain('DeepSeek 是一家非常有潜力的 AI 公司');
      expect(result).not.toContain('Ignored Question');
      expect(result).toContain('【AI 发展趋势】');
      expect(result).toContain('未来 AI 将改变世界'); // HTML tags stripped
    });

    it('should handle empty data', () => {
      const result = ZhihuClient.cleanActivityData([]);
      expect(result).toBe('');
    });
  });
});

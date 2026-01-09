import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentAnalysisService } from './CommentAnalysisService';
import { LLMService } from './LLMService';
import { ConfigService } from './ConfigService';
import { I18nService } from './I18nService';

// Mock dependencies
vi.mock('./LLMService', () => ({
  LLMService: {
    generateRawText: vi.fn(),
  },
}));

vi.mock('./ConfigService', () => ({
  ConfigService: {
    getConfig: vi.fn(),
  },
}));

vi.mock('./I18nService', () => ({
  I18nService: {
    getLanguage: vi.fn(),
    t: (key: string) => key,
  },
}));

describe('CommentAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeComments', () => {
    it('should analyze comments correctly', async () => {
      // Mock config
      vi.mocked(ConfigService.getConfig).mockResolvedValue({
        analysisMode: 'balanced',
        platformAnalysisModes: { zhihu: 'balanced' }
      } as any);

      // Mock I18n
      vi.mocked(I18nService.getLanguage).mockReturnValue('zh-CN');

      // Mock LLM response
      const mockResult = {
        summary: 'Test summary',
        stance_ratio: { support: 0.5, oppose: 0.3, neutral: 0.2 },
        key_points: [],
        sentiment: 'positive'
      };
      vi.mocked(LLMService.generateRawText).mockResolvedValue(JSON.stringify(mockResult));

      const comments = [
        { id: '1', author: 'User1', content: 'Good post', likes: 10 },
        { id: '2', author: 'User2', content: 'Bad post', likes: 5 }
      ];

      const result = await CommentAnalysisService.analyzeComments(comments, 'Test Topic', 'Test Content', 'zhihu');

      expect(result).toEqual(mockResult);
      expect(LLMService.generateRawText).toHaveBeenCalled();
    });

    it('should handle empty comments', async () => {
      await expect(CommentAnalysisService.analyzeComments([], 'Test Topic')).rejects.toThrow('没有找到可分析的评论');
    });

    it('should handle LLM parsing error', async () => {
      vi.mocked(ConfigService.getConfig).mockResolvedValue({} as any);
      vi.mocked(I18nService.getLanguage).mockReturnValue('zh-CN');
      vi.mocked(LLMService.generateRawText).mockResolvedValue('Invalid JSON');

      const comments = [{ id: '1', author: 'User1', content: 'Content' }];

      await expect(CommentAnalysisService.analyzeComments(comments, 'Test Topic')).rejects.toThrow();
    });
    
    it('should handle markdown code block in LLM response', async () => {
      vi.mocked(ConfigService.getConfig).mockResolvedValue({} as any);
      vi.mocked(I18nService.getLanguage).mockReturnValue('zh-CN');
      
      const mockResult = { summary: 'Test' };
      const response = '```json\n' + JSON.stringify(mockResult) + '\n```';
      
      vi.mocked(LLMService.generateRawText).mockResolvedValue(response);
      
      const comments = [{ id: '1', author: 'User1', content: 'Content' }];
      const result = await CommentAnalysisService.analyzeComments(comments, 'Test Topic');
      
      expect(result).toEqual(mockResult);
    });
  });
});

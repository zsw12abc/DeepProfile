import { describe, it, expect, vi } from 'vitest';
import { TopicService } from './TopicService';
import { LLMService } from './LLMService';
import { I18nService } from './I18nService';

// Mock dependencies
vi.mock('./LLMService', () => ({
  LLMService: {
    generateRawText: vi.fn(),
  },
}));

vi.mock('./I18nService', () => ({
  I18nService: {
    t: (key: string) => key,
  },
}));

describe('TopicService', () => {
  describe('classify', () => {
    it('should classify politics correctly', () => {
      expect(TopicService.classify('关于美国大选的讨论')).toBe('politics');
      expect(TopicService.classify('国际地缘政治分析')).toBe('politics');
    });

    it('should classify economy correctly', () => {
      expect(TopicService.classify('经济股市大跌')).toBe('economy');
      expect(TopicService.classify('金融通货膨胀')).toBe('economy');
    });

    it('should classify technology correctly', () => {
      expect(TopicService.classify('人工智能的发展')).toBe('technology');
      expect(TopicService.classify('新款显卡评测')).toBe('technology');
    });

    it('should classify entertainment correctly', () => {
      expect(TopicService.classify('娱乐游戏')).toBe('entertainment');
      expect(TopicService.classify('看动漫')).toBe('entertainment');
    });

    it('should classify society correctly', () => {
      expect(TopicService.classify('女权主义相关话题')).toBe('society');
      expect(TopicService.classify('关于家庭观念的讨论')).toBe('society');
      expect(TopicService.classify('关于躺平与奋斗')).toBe('society'); // '躺平'和'奋斗'在社会类别下
    });
    
    it('should classify lifestyle_career correctly', () => {
      expect(TopicService.classify('职场找工作')).toBe('lifestyle_career');
      expect(TopicService.classify('健康养生')).toBe('lifestyle_career');
    });

    it('should return general for unknown topics', () => {
      expect(TopicService.classify('今天天气不错')).toBe('general');
    });
    
    it('should handle empty input', () => {
      expect(TopicService.classify('')).toBe('general');
    });
  });

  describe('classifyWithLLM', () => {
    it('should return category from LLM', async () => {
      vi.mocked(LLMService.generateRawText).mockResolvedValue('politics');
      const result = await TopicService.classifyWithLLM('some political text');
      expect(result).toBe('politics');
    });

    it('should fallback to general on LLM error', async () => {
      vi.mocked(LLMService.generateRawText).mockRejectedValue(new Error('API Error'));
      const result = await TopicService.classifyWithLLM('some text');
      expect(result).toBe('general');
    });

    it('should fallback to general on invalid LLM response', async () => {
      vi.mocked(LLMService.generateRawText).mockResolvedValue('invalid_category');
      const result = await TopicService.classifyWithLLM('some text');
      expect(result).toBe('general');
    });
  });
  
  describe('getCategoryName', () => {
    it('should return translated category name', () => {
      expect(TopicService.getCategoryName('politics')).toBe('category_politics');
      expect(TopicService.getCategoryName('technology')).toBe('category_technology');
    });
  });
});

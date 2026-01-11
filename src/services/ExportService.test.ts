import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from './ExportService';
import { TopicService } from './TopicService';
import { I18nService } from './I18nService';
import { calculateFinalLabel, parseLabelName } from './LabelUtils';

// Mock dependencies
vi.mock('./TopicService', () => ({
  TopicService: {
    getCategoryName: vi.fn(() => 'Technology'),
  },
}));

vi.mock('./I18nService', () => ({
  I18nService: {
    getLanguage: vi.fn(() => 'zh-CN'),
    t: (key: string) => key,
  },
}));

// Mock the calculateFinalLabel function properly
vi.mock('./LabelUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./LabelUtils')>();
  return {
    ...actual,
    calculateFinalLabel: (label: string, score: number) => {
      return { label, percentage: Math.abs(score) * 100 };
    },
    parseLabelName: (labelName: string) => {
      if (labelName.includes('vs')) {
        const [left, right] = labelName.split('vs').map(s => s.trim());
        return { left, right };
      }
      return { left: '', right: labelName };
    }
  };
});

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toMarkdown', () => {
    it('should generate markdown content', () => {
      const profile = {
        nickname: 'Test User',
        summary: 'Test summary',
        value_orientation: [
          { label: 'innovation', score: 0.8 }
        ],
        evidence: [
          { quote: 'Test quote', analysis: 'Test analysis', source_title: 'Test source' }
        ]
      };
      
      const markdown = ExportService.toMarkdown(profile as any, 'technology', 'http://example.com', Date.now());
      
      expect(markdown).toContain('# 👤 app_name topic_classification Report');
      expect(markdown).toContain('Test User');
      expect(markdown).toContain('Test summary');
      expect(markdown).toContain('innovation');
      expect(markdown).toContain('Test quote');
      expect(markdown).toContain('Test analysis');
      // Check for progress bar characters
      expect(markdown).toContain('🟦'); 
    });

    it('should handle negative scores correctly', () => {
      const profile = {
        nickname: 'Test User',
        summary: 'Test summary',
        value_orientation: [
          { label: 'innovation', score: -0.8 }
        ],
        evidence: []
      };
      
      const markdown = ExportService.toMarkdown(profile as any, 'technology', 'http://example.com', Date.now());
      
      // Check for red progress bar characters
      expect(markdown).toContain('🟥');
    });

    it('should handle empty value orientation', () => {
      const profile = {
        nickname: 'Test User',
        summary: 'Test summary',
        value_orientation: [],
        evidence: []
      };
      
      const markdown = ExportService.toMarkdown(profile as any, 'technology', 'http://example.com', Date.now());
      
      expect(markdown).toContain('no_data');
    });
  });
});

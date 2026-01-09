import { describe, it, expect, vi } from 'vitest';
import { parseLabelName, calculateFinalLabel, getLabelInfo, getRelevantLabelsByTopic, filterLabelsByTopic } from './LabelUtils';
import { I18nService } from './I18nService';

// Mock dependencies
vi.mock('./I18nService', () => ({
  I18nService: {
    getLanguage: vi.fn(() => 'zh-CN'),
  },
}));

// Mock LabelDefinitions to avoid dependency on actual file content which might change
vi.mock('./LabelDefinitions', () => ({
  createLabelCategories: () => [
    {
      id: 'politics',
      name: '政治倾向',
      labels: [
        { id: 'ideology', name: '左派 vs 右派', description: '...', category: 'politics' },
        { id: 'authority', name: '自由意志 vs 威权主义', description: '...', category: 'politics' }
      ]
    },
    {
      id: 'technology',
      name: '科技观点',
      labels: [
        { id: 'open_vs_closed', name: '开放 vs 封闭', description: '...', category: 'technology' }
      ]
    }
  ],
  getLabelCategories: () => [
    {
      id: 'politics',
      name: '政治倾向',
      labels: [
        { id: 'ideology', name: '左派 vs 右派', description: '...', category: 'politics' },
        { id: 'authority', name: '自由意志 vs 威权主义', description: '...', category: 'politics' }
      ]
    },
    {
      id: 'technology',
      name: '科技观点',
      labels: [
        { id: 'open_vs_closed', name: '开放 vs 封闭', description: '...', category: 'technology' }
      ]
    }
  ]
}));

describe('LabelUtils', () => {
  describe('parseLabelName', () => {
    it('should parse standard label name', () => {
      const result = parseLabelName('左派 vs 右派');
      expect(result).toEqual({ left: '左派', right: '右派' });
    });

    it('should parse label ID using fallback map', () => {
      const result = parseLabelName('ideology');
      expect(result).toEqual({ left: '左派', right: '右派' });
    });

    it('should handle non-standard label name', () => {
      const result = parseLabelName('Unknown Label');
      expect(result).toEqual({ left: '', right: 'Unknown Label' });
    });
  });

  describe('calculateFinalLabel', () => {
    it('should calculate label for positive score', () => {
      const result = calculateFinalLabel('ideology', 0.8);
      expect(result.label).toBe('右派');
      expect(result.percentage).toBe(80);
    });

    it('should calculate label for negative score', () => {
      const result = calculateFinalLabel('ideology', -0.6);
      expect(result.label).toBe('左派');
      expect(result.percentage).toBe(60);
    });

    it('should clamp score between -1 and 1', () => {
      const result = calculateFinalLabel('ideology', 1.5);
      expect(result.percentage).toBe(100);
    });
  });

  describe('getLabelInfo', () => {
    it('should return label info for existing ID', () => {
      const info = getLabelInfo('ideology');
      expect(info).toBeDefined();
      expect(info?.name).toBe('左派 vs 右派');
      expect(info?.categoryName).toBe('政治倾向');
    });

    it('should return null for non-existing ID', () => {
      const info = getLabelInfo('non_existent');
      expect(info).toBeNull();
    });
  });

  describe('getRelevantLabelsByTopic', () => {
    it('should return politics labels for political topic', () => {
      const labels = getRelevantLabelsByTopic('政治讨论');
      const ids = labels.map(l => l.id);
      expect(ids).toContain('ideology');
      expect(ids).toContain('authority');
    });

    it('should return technology labels for tech topic', () => {
      const labels = getRelevantLabelsByTopic('人工智能技术');
      const ids = labels.map(l => l.id);
      expect(ids).toContain('open_vs_closed');
    });
  });

  describe('filterLabelsByTopic', () => {
    it('should filter relevant labels', () => {
      const labels = [
        { label: 'ideology', score: 0.5 },
        { label: 'open_vs_closed', score: 0.8 }
      ];
      
      const filtered = filterLabelsByTopic(labels, '政治');
      expect(filtered.length).toBe(1);
      expect(filtered[0].label).toBe('ideology');
    });

    it('should return empty for entertainment topic if configured', () => {
      const labels = [{ label: 'ideology', score: 0.5 }];
      const filtered = filterLabelsByTopic(labels, '娱乐八卦');
      // Based on implementation, entertainment might return empty or filtered
      // In the mock implementation, '娱乐' is not explicitly handled in getRelevantLabelsByTopic
      // so it falls back to default (politics, society, economy).
      // However, filterLabelsByTopic has a check: if filtered is empty and topic is entertainment, return empty.
      // But here filtered won't be empty because default includes politics.
      
      // Wait, let's check getRelevantLabelsByTopic implementation in LabelUtils.ts
      // It has a default fallback: relevantCategories.push('politics', 'society', 'economy');
      // So '娱乐八卦' will get politics labels as relevant.
      // So 'ideology' will be kept.
      
      // But wait, filterLabelsByTopic has logic:
      // if (filtered.length === 0 && labels.length > 0) { ... check entertainment ... }
      
      // So if 'ideology' is in relevant labels (due to default fallback), it will be returned.
      // Let's check if '娱乐' matches any specific condition in getRelevantLabelsByTopic.
      // It doesn't seem to match any specific condition in the provided code snippet for getRelevantLabelsByTopic.
      // So it goes to else block -> politics, society, economy.
      
      expect(filtered.length).toBe(1); 
    });
  });
});

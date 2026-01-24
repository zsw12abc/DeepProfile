import { describe, it, expect, beforeEach } from 'vitest';
import { LLMService } from './LLMService';
import { TopicService } from './TopicService';
import { ConsistencyService } from './ConsistencyService';
import { ProfileData } from './ConsistencyService';

describe('Edge Case Tests', () => {
  describe('LLMService Edge Cases', () => {
    it('should handle various label ID formats', () => {
      const testCases = [
        { input: 'IDELOGY', expected: 'ideology' },
        { input: 'Ideology', expected: 'ideology' },
        { input: 'left-right', expected: 'ideology' },
        { input: '  ideology  ', expected: 'ideology' },
        { input: 'idealogoy', expected: 'ideology' }, // 常见拼写错误
        { input: 'AUTHROITY', expected: 'authority' }, // 常见拼写错误
        { input: 'MARKET_VS_GOV', expected: 'market_vs_gov' },
        { input: 'market.gov', expected: 'market_vs_gov' },
        { input: 'market vs gov', expected: 'market_vs_gov' },
        { input: 'compétition_vs_équality', expected: 'competition_vs_equality' }, // 特殊字符
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(LLMService.normalizeLabelId(input)).toBe(expected);
      });
    });

    it('should handle malformed JSON responses', () => {
      const malformedResponses = [
        '```json\n{"invalid": "json"\n```',
        '{invalid_json}',
        '{"incomplete": "obj"',
        'Some text\n{"valid": "json"}\nmore text',
        '```json\n{"nested": {"obj": "ect"}}\n```',
      ];
      
      malformedResponses.forEach(response => {
        expect(() => {
          const result = (LLMService as any).prototype.validateAndFixResponse(response);
          JSON.parse(result);
        }).not.toThrow();
      });
    });

    it('should handle invalid score values', () => {
      const responseWithInvalidScores = JSON.stringify({
        nickname: "Test User",
        topic_classification: "Technology",
        value_orientation: [
          { label: "ideology", score: 2.5 }, // Invalid: > 1
          { label: "authority", score: -1.8 }, // Invalid: < -1
          { label: "change", score: "invalid" }, // Invalid: not a number
          { label: "geopolitics", score: NaN }, // Invalid: NaN
          { label: "market_vs_gov", score: Infinity }, // Invalid: Infinity
          { label: "competition_vs_equality", score: -Infinity }, // Invalid: -Infinity
        ],
        summary: "Test summary"
      });

      const result = (LLMService as any).prototype.validateAndFixResponse(responseWithInvalidScores);
      const parsed = JSON.parse(result);
      
      expect(parsed.value_orientation).toBeDefined();
      parsed.value_orientation.forEach((item: any) => {
        expect(typeof item.score).toBe('number');
        expect(item.score).toBeGreaterThanOrEqual(-1);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle missing required fields', () => {
      const incompleteResponse = JSON.stringify({
        // Missing nickname
        topic_classification: "", // Empty
        value_orientation: null, // Null
        // Missing summary
        evidence: undefined // Undefined
      });

      const result = (LLMService as any).prototype.validateAndFixResponse(incompleteResponse);
      const parsed = JSON.parse(result);
      
      expect(parsed.nickname).toBe("");
      expect(parsed.topic_classification).toBe("Unknown");
      expect(Array.isArray(parsed.value_orientation)).toBe(true);
      expect(parsed.summary).toBe("Analysis completed.");
      expect(Array.isArray(parsed.evidence)).toBe(true);
    });
  });

  describe('TopicService Edge Cases', () => {
    it('should handle empty/null context', () => {
      expect(TopicService.classify(null)).toBe('general');
      expect(TopicService.classify(undefined)).toBe('general');
      expect(TopicService.classify("")).toBe('general');
      expect(TopicService.classify("   ")).toBe('general');
    });

    it('should handle mixed-topic content', () => {
      const mixedContent = "这篇文章既讨论了政治问题，又谈到了经济影响。";
      const category = TopicService.classify(mixedContent);
      // 应该返回更通用的分类或最相关的分类
      expect(['politics', 'economy', 'general']).toContain(category);
    });

    it('should handle content with special characters', () => {
      const specialContent = "这是一些包含@#$%^&*特殊字符的内容，还有数字123456789。";
      const category = TopicService.classify(specialContent);
      expect(category).toBe('general');
    });

    it('should handle very long content', () => {
      const longContent = "测试".repeat(10000) + "技术相关词汇";
      const category = TopicService.classify(longContent);
      expect(category).toBe('technology'); // Should still classify based on keywords
    });

    it('should handle content with multiple languages', () => {
      const multilingualContent = "This is English and 这是中文 and هذا عربي (though Arabic might not be in our keywords)";
      const category = TopicService.classify(multilingualContent);
      expect(typeof category).toBe('string');
    });
  });

  describe('ConsistencyService Edge Cases', () => {
    let sampleProfile: ProfileData;

    beforeEach(() => {
      sampleProfile = {
        nickname: 'Test User',
        topic_classification: 'technology',
        value_orientation: [
          { label: 'innovation_vs_security', score: 0.8 },
          { label: 'optimism_vs_conservatism', score: 0.5 }, // Medium score
          { label: 'decentralization_vs_centralization', score: 0.3 }, // Low score
          { label: 'open_vs_closed', score: -0.9 }
        ],
        summary: 'This user shows innovation and openness tendencies.',
        evidence: [
          {
            quote: 'Sample quote',
            analysis: 'Sample analysis',
            source_title: 'Source',
            source_id: '1'
          }
        ]
      };
    });

    it('should handle profile with no value orientations', () => {
      const profileWithoutLabels = { ...sampleProfile, value_orientation: undefined };
      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithoutLabels);
      expect(result).toEqual(profileWithoutLabels);
    });

    it('should handle profile with no evidence', () => {
      const profileWithoutEvidence = { ...sampleProfile, evidence: undefined };
      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithoutEvidence);
      expect(result).toEqual(profileWithoutEvidence);
    });

    it('should handle profile with only medium/low score labels', () => {
      const profileWithOnlyLowScores = {
        ...sampleProfile,
        value_orientation: [
          { label: 'innovation_vs_security', score: 0.5 }, // Medium
          { label: 'optimism_vs_conservatism', score: 0.3 } // Low
        ]
      };
      
      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithOnlyLowScores);
      // Should still add evidence for medium scores
      expect(result.evidence).toBeDefined();
    });

    it('should handle profile with invalid label IDs', () => {
      const profileWithInvalidLabels = {
        ...sampleProfile,
        value_orientation: [
          { label: 'nonexistent_label', score: 0.8 },
          { label: 'another_fake_label', score: 0.6 }
        ]
      };
      
      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithInvalidLabels);
      // Should handle gracefully without crashing
      expect(result).toBeDefined();
    });

    it('should handle empty summary and evidence', () => {
      const profileWithEmptyFields = {
        ...sampleProfile,
        summary: '',
        evidence: []
      };
      
      const result = ConsistencyService.validateAndFixSummaryConsistency(profileWithEmptyFields);
      expect(result).toEqual(profileWithEmptyFields);
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle classification with high confidence', async () => {
      const result = await TopicService.classifyWithConfidence("这是一篇关于人工智能和机器学习的技术文章");
      expect(result.category).toBe('technology');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle classification disagreement between keyword and LLM', async () => {
      // Mock the LLM classification to return a different result
      const originalClassifyWithLLM = TopicService.classifyWithLLM;
      TopicService.classifyWithLLM = async () => Promise.resolve('economy') as any;
      
      try {
        const result = await TopicService.classifyWithConfidence("这是一篇关于政治的文章");
        expect(result.confidence).toBeLessThan(1.0); // Lower confidence due to disagreement
      } finally {
        // Restore original method
        TopicService.classifyWithLLM = originalClassifyWithLLM;
      }
    });
  });
});
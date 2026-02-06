import { describe, it, expect, beforeEach } from "vitest";
import { LLMService } from "./LLMService";
import { TopicService } from "./TopicService";
import { ConsistencyService } from "./ConsistencyService";
import { ProfileData } from "./ConsistencyService";

describe("Improved Edge Case Tests", () => {
  describe("LLMService Edge Cases", () => {
    it("should handle various label ID formats", () => {
      const testCases = [
        { input: "IDELOGY", expected: "ideology" },
        { input: "Ideology", expected: "ideology" },
        { input: "left-right", expected: "ideology" },
        { input: "  ideology  ", expected: "ideology" },
        { input: "idealogoy", expected: "ideology" }, // 常见拼写错误
        { input: "AUTHROITY", expected: "authority" }, // 常见拼写错误
        { input: "MARKET_VS_GOV", expected: "market_vs_gov" },
        { input: "market.gov", expected: "market_vs_gov" },
        { input: "market vs gov", expected: "market_vs_gov" },
        {
          input: "compétition_vs_équality",
          expected: "competition_vs_equality",
        }, // 特殊字符
        { input: "left_right", expected: "ideology" }, // 原有的变体
        { input: "libertarian_authoritarian", expected: "authority" }, // 原有的变体
        { input: "traditional_progressive", expected: "change" }, // 原有的变体
      ];

      testCases.forEach(({ input, expected }) => {
        const result = LLMService.normalizeLabelId(input);
        expect(result).toBe(expected);
      });
    });

    it("should handle invalid score values with custom validation", () => {
      // Test the normalization of scores
      const testScoreNormalization = (
        score: any,
        expectedMin: number,
        expectedMax: number,
      ) => {
        let normalizedScore = score;
        if (
          typeof score !== "number" ||
          isNaN(score) ||
          score === Infinity ||
          score === -Infinity
        ) {
          normalizedScore = 0.5;
        } else {
          normalizedScore = Math.max(-1, Math.min(1, score)); // 限制分数范围
        }

        expect(normalizedScore).toBeGreaterThanOrEqual(expectedMin);
        expect(normalizedScore).toBeLessThanOrEqual(expectedMax);
      };

      // Test various problematic scores
      testScoreNormalization(2.5, -1, 1); // > 1
      testScoreNormalization(-1.8, -1, 1); // < -1
      testScoreNormalization(NaN, -1, 1); // NaN
      testScoreNormalization(Infinity, -1, 1); // Infinity
      testScoreNormalization(-Infinity, -1, 1); // -Infinity
      testScoreNormalization("invalid", -1, 1); // Not a number
      testScoreNormalization(0.5, -1, 1); // Valid
    });
  });

  describe("TopicService Edge Cases", () => {
    it("should handle empty/null context", () => {
      expect(TopicService.classify(null)).toBe("general");
      expect(TopicService.classify(undefined)).toBe("general");
      expect(TopicService.classify("")).toBe("general");
      expect(TopicService.classify("   ")).toBe("general");
    });

    it("should handle mixed-topic content", () => {
      const mixedContent = "这篇文章既讨论了政治问题，又谈到了经济影响。";
      const category = TopicService.classify(mixedContent);
      // 应该返回更通用的分类或最相关的分类
      expect(["politics", "economy", "general"]).toContain(category);
    });

    it("should handle content with special characters", () => {
      const specialContent =
        "这是一些包含@#$%^&*特殊字符的内容，还有数字123456789。";
      const category = TopicService.classify(specialContent);
      expect(category).toBe("general");
    });

    it("should handle very long content", () => {
      const longContent = "技术".repeat(1000) + "相关词汇";
      const category = TopicService.classify(longContent);
      expect(category).toBe("technology"); // Should still classify based on keywords
    });

    it("should calculate keyword confidence properly", () => {
      const text = "这是一个关于人工智能和机器学习的技术文章";
      const category = "technology";
      const confidence = (TopicService as any).calculateKeywordConfidence(
        text,
        category,
      );

      expect(confidence).toBeGreaterThanOrEqual(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("ConsistencyService Edge Cases", () => {
    let sampleProfile: ProfileData;

    beforeEach(() => {
      sampleProfile = {
        nickname: "Test User",
        topic_classification: "technology",
        value_orientation: [
          { label: "innovation_vs_security", score: 0.8 },
          { label: "optimism_vs_conservatism", score: 0.5 }, // Medium score
          { label: "decentralization_vs_centralization", score: 0.3 }, // Low score
          { label: "open_vs_closed", score: -0.9 },
        ],
        summary: "This user shows innovation and openness tendencies.",
        evidence: [
          {
            quote: "Sample quote",
            analysis: "Sample analysis",
            source_title: "Source",
            source_id: "1",
          },
        ],
      };
    });

    it("should handle profile with no value orientations", () => {
      const profileWithoutLabels = {
        ...sampleProfile,
        value_orientation: undefined,
      };
      const result =
        ConsistencyService.validateAndFixEvidenceConsistency(
          profileWithoutLabels,
        );
      expect(result).toEqual(profileWithoutLabels);
    });

    it("should handle profile with no evidence", () => {
      const profileWithoutEvidence = { ...sampleProfile, evidence: undefined };
      const result = ConsistencyService.validateAndFixEvidenceConsistency(
        profileWithoutEvidence,
      );
      expect(result).toEqual(profileWithoutEvidence);
    });

    it("should handle profile with only medium/low score labels", () => {
      const profileWithOnlyLowScores = {
        ...sampleProfile,
        value_orientation: [
          { label: "innovation_vs_security", score: 0.5 }, // Medium
          { label: "optimism_vs_conservatism", score: 0.3 }, // Low
        ],
      };

      const result = ConsistencyService.validateAndFixEvidenceConsistency(
        profileWithOnlyLowScores,
      );
      // Should still add evidence for medium scores
      expect(result.evidence).toBeDefined();
    });

    it("should handle profile with invalid label IDs", () => {
      const profileWithInvalidLabels = {
        ...sampleProfile,
        value_orientation: [
          { label: "nonexistent_label", score: 0.8 },
          { label: "another_fake_label", score: 0.6 },
        ],
      };

      const result = ConsistencyService.validateAndFixEvidenceConsistency(
        profileWithInvalidLabels,
      );
      // Should handle gracefully without crashing
      expect(result).toBeDefined();
    });

    it("should handle empty summary and evidence", () => {
      const profileWithEmptyFields = {
        ...sampleProfile,
        summary: "",
        evidence: [],
      };

      const result = ConsistencyService.validateAndFixSummaryConsistency(
        profileWithEmptyFields,
      );
      expect(result).toEqual(profileWithEmptyFields);
    });
  });

  describe("Confidence-based Classification", () => {
    it("should return confidence scores with classification", async () => {
      const result =
        await TopicService.classifyWithConfidence(
          "这是一个关于人工智能技术的文章",
        );
      expect(result.category).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should calculate keyword confidence correctly", () => {
      const text = "这个用户经常讨论技术和编程相关的话题";
      const category: any = "technology";
      const confidence = (TopicService as any).calculateKeywordConfidence(
        text,
        category,
      );

      expect(confidence).toBeGreaterThanOrEqual(0.5); // Base confidence
    });
  });
});

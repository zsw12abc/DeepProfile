import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMService } from "./LLMService";
import { LabelService } from "./LabelService";
import { I18nService } from "./I18nService";
import { TopicService } from "./TopicService";
import { StructuredOutputService } from "./StructuredOutputService";

// Mock the dependencies to avoid actual API calls
vi.mock("./ConfigService");
vi.mock("./LabelService");
vi.mock("./I18nService");
vi.mock("./TopicService");

describe("LLMService Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("structured output functionality", () => {
    it("should generate valid fast mode profile structure", async () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Politics");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      // Get the format instructions to understand the expected structure
      const instructions = LLMService.getParserInstructions("fast");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).not.toContain("reasoning");
      expect(instructions).not.toContain("evidence");
    });

    it("should generate valid balanced mode profile structure", async () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Politics");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      // Get the format instructions to understand the expected structure
      const instructions = LLMService.getParserInstructions("balanced");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).toContain("reasoning");
      expect(instructions).toContain("evidence");
    });

    it("should validate fast mode schema correctly", async () => {
      const validFastOutput = JSON.stringify({
        nickname: "Test User",
        topic_classification: "Politics",
        value_orientation: [{ label: "ideology", score: 0.5 }],
        summary: "Test summary",
      });

      const result = await StructuredOutputService.parseOutput(
        validFastOutput,
        "fast",
      );
      expect(result.nickname).toBe("Test User");
      expect(result.topic_classification).toBe("Politics");
      expect(Array.isArray(result.value_orientation)).toBe(true);
      expect(result.value_orientation[0]).toEqual({
        label: "ideology",
        score: 0.5,
      });
      expect(result.summary).toBe("Test summary");
    });

    it("should validate balanced mode schema correctly", async () => {
      const validBalancedOutput = JSON.stringify({
        nickname: "Test User",
        topic_classification: "Politics",
        reasoning: "Step-by-step analysis",
        value_orientation: [{ label: "ideology", score: 0.5 }],
        summary: "Test summary",
        evidence: [
          {
            quote: "Sample quote",
            analysis: "Sample analysis",
            source_title: "Source title",
          },
        ],
      });

      const result = await StructuredOutputService.parseOutput(
        validBalancedOutput,
        "balanced",
      );
      const typedResult = result as any;
      expect(result.nickname).toBe("Test User");
      expect(typedResult.reasoning).toBe("Step-by-step analysis");
      expect(typedResult.evidence).toHaveLength(1);
      expect(typedResult.evidence[0].quote).toBe("Sample quote");
    });

    it("should reject invalid score values", async () => {
      const invalidOutput = JSON.stringify({
        nickname: "Test User",
        topic_classification: "Politics",
        value_orientation: [
          { label: "ideology", score: 2.5 }, // Invalid score > 1
        ],
        summary: "Test summary",
      });

      await expect(
        StructuredOutputService.parseOutput(invalidOutput, "fast"),
      ).rejects.toThrow();
    });

    it("should reject missing required fields", async () => {
      const incompleteOutput = JSON.stringify({
        nickname: "Test User",
        // Missing required fields
      });

      await expect(
        StructuredOutputService.parseOutput(incompleteOutput, "fast"),
      ).rejects.toThrow();
    });
  });
});

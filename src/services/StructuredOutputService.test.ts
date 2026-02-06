import { describe, it, expect } from "vitest";
import { StructuredOutputService } from "./StructuredOutputService";

describe("StructuredOutputService", () => {
  describe("getFormatInstructions", () => {
    it("should return format instructions for fast mode", () => {
      const instructions =
        StructuredOutputService.getFormatInstructions("fast");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).not.toContain("reasoning");
      expect(instructions).not.toContain("evidence");
    });

    it("should return format instructions for balanced mode", () => {
      const instructions =
        StructuredOutputService.getFormatInstructions("balanced");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).toContain("reasoning");
      expect(instructions).toContain("evidence");
    });

    it("should return format instructions for deep mode", () => {
      const instructions =
        StructuredOutputService.getFormatInstructions("deep");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).toContain("reasoning");
      expect(instructions).toContain("evidence");
    });
  });

  describe("parseOutput", () => {
    it("should parse fast mode output correctly", async () => {
      const validFastOutput = `{
        "nickname": "Test User",
        "topic_classification": "Politics",
        "value_orientation": [
          { "label": "ideology", "score": 0.5 }
        ],
        "summary": "Test summary"
      }`;

      const result = await StructuredOutputService.parseOutput(
        validFastOutput,
        "fast",
      );
      expect(result.nickname).toBe("Test User");
      expect(result.topic_classification).toBe("Politics");
      expect(result.value_orientation).toHaveLength(1);
      expect(result.value_orientation[0].label).toBe("ideology");
      expect(result.value_orientation[0].score).toBe(0.5);
      expect(result.summary).toBe("Test summary");
      expect(result.reasoning).toBeUndefined();
      expect(result.evidence).toBeUndefined();
    });

    it("should parse balanced mode output correctly", async () => {
      const validBalancedOutput = `{
        "nickname": "Test User",
        "topic_classification": "Politics",
        "reasoning": "Step-by-step analysis",
        "value_orientation": [
          { "label": "ideology", "score": 0.5 }
        ],
        "summary": "Test summary",
        "evidence": [
          {
            "quote": "Sample quote",
            "analysis": "Sample analysis",
            "source_title": "Source title"
          }
        ]
      }`;

      const result = await StructuredOutputService.parseOutput(
        validBalancedOutput,
        "balanced",
      );
      expect(result.nickname).toBe("Test User");
      expect(result.topic_classification).toBe("Politics");
      expect(result.reasoning).toBe("Step-by-step analysis");
      expect(result.value_orientation).toHaveLength(1);
      expect(result.value_orientation[0].label).toBe("ideology");
      expect(result.value_orientation[0].score).toBe(0.5);
      expect(result.summary).toBe("Test summary");
      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].quote).toBe("Sample quote");
    });

    it("should throw error for invalid output", async () => {
      const invalidOutput = `{
        "nickname": 123,
        "topic_classification": "Politics"
      }`;

      await expect(
        StructuredOutputService.parseOutput(invalidOutput, "fast"),
      ).rejects.toThrow();
    });

    it("should validate score ranges correctly", async () => {
      const invalidScoreOutput = `{
        "nickname": "Test User",
        "topic_classification": "Politics",
        "value_orientation": [
          { "label": "ideology", "score": 2.0 }
        ],
        "summary": "Test summary"
      }`;

      await expect(
        StructuredOutputService.parseOutput(invalidScoreOutput, "fast"),
      ).rejects.toThrow();
    });
  });
});

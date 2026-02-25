import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeAndFixResponse } from "./LLMResponseNormalizer";
import { ConfigService } from "./ConfigService";
import { Logger } from "./Logger";
import { normalizeLabelId } from "./LLMLabelNormalizer";

// Mock dependencies
vi.mock("./ConfigService", () => ({
  ConfigService: {
    getConfigSync: vi.fn(),
  },
}));

vi.mock("./Logger", () => ({
  Logger: {
    info: vi.fn(),
  },
}));

vi.mock("./LLMLabelNormalizer", () => ({
  normalizeLabelId: vi.fn((label: string) => `normalized_${label}`),
}));

describe("LLMResponseNormalizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Config and Logging handling", () => {
    it("should skip debug logging if config fails to load", () => {
      vi.mocked(ConfigService.getConfigSync).mockImplementation(() => {
        throw new Error("Config not ready");
      });
      const input = '{"nickname":"n","value_orientation":[],"summary":"ok"}';
      const result = normalizeAndFixResponse(input);
      expect(JSON.parse(result).nickname).toBe("n");
      expect(Logger.info).not.toHaveBeenCalled();
    });

    it("should log raw response and prefix/suffix removals if debug is enabled", () => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: true,
      } as any);

      const input = '```json\n{"nickname":"test","value_orientation":[]}\n```';
      normalizeAndFixResponse(input);

      expect(Logger.info).toHaveBeenCalledWith("【LLM RAW RESPONSE】", input);
      expect(Logger.info).toHaveBeenCalledWith(
        "【LLM RESPONSE】Removed '```json' prefix",
      );
      expect(Logger.info).toHaveBeenCalledWith(
        "【LLM RESPONSE】Removed '```' suffix",
      );
    });

    it("should remove ``` prefix if json specifier is missing", () => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: true,
      } as any);

      const input = '```\n{"nickname":"test","value_orientation":[]}';
      normalizeAndFixResponse(input);

      expect(Logger.info).toHaveBeenCalledWith(
        "【LLM RESPONSE】Removed '```' prefix",
      );
    });
  });

  describe("JSON Extraction Fallbacks", () => {
    beforeEach(() => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: true,
      } as any);
    });

    it("should extract JSON using regex if direct parse fails", () => {
      const input =
        'Here is my response:\n{"nickname":"test","value_orientation":[]}\nHope this helps!';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.nickname).toBe("test");
      expect(Logger.info).toHaveBeenCalledWith(
        "【LLM RESPONSE】Successfully extracted JSON from text",
      );
    });

    it("should throw and handle error if regex found but parse fails", () => {
      const input = 'Here is my response:\n{"nickname":"test", broken JSON }\n';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.summary).toBe("Analysis Failed");
      expect(parsed.nickname).toBe("");
    });

    it("should throw and handle error if no JSON object is found in text", () => {
      const input = "I am a helpful assistant. I couldn't find any data.";
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.summary).toBe("Analysis Failed");
    });
  });

  describe("Value Orientation Normalization", () => {
    beforeEach(() => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: true,
      } as any);
      vi.mocked(normalizeLabelId).mockImplementation(
        (label: string) => `normalized_${label.toLowerCase()}`,
      );
    });

    it("should fallback to political_leaning if value_orientation is missing", () => {
      const input = '{"political_leaning":["Conservative"]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0].label).toBe("normalized_conservative");
      expect(parsed.value_orientation[0].score).toBe(0.5); // Defaults to 0.5 because input was string
      expect(Logger.info).toHaveBeenCalledWith(
        "【LLM RESPONSE】Using 'political_leaning' field as 'value_orientation'",
      );
      expect(parsed.political_leaning).toBeUndefined();
    });

    it("should set empty array if both value_orientation and political_leaning are missing", () => {
      const input = '{"nickname":"test"}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation).toEqual([]);
    });

    it("should set empty array if value_orientation is not an array", () => {
      const input = '{"value_orientation":"Conservative"}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation).toEqual([]);
    });

    it("should convert string item to object", () => {
      const input = '{"value_orientation":["Liberal"]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0]).toEqual({
        label: "normalized_liberal",
        score: 0.5,
      });
    });

    it("should handle object with missing score", () => {
      const input = '{"value_orientation":[{"label":"Libertarian"}]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0]).toEqual({
        label: "normalized_libertarian",
        score: 0.5,
      });
    });

    it("should handle object with invalid score", () => {
      const input =
        '{"value_orientation":[{"label":"Authoritarian", "score": "invalid"}]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0]).toEqual({
        label: "normalized_authoritarian",
        score: 0.5,
      });
    });

    it("should clamp valid scores outside of threshold", () => {
      const input =
        '{"value_orientation":[{"label":"High", "score": 2.5}, {"label":"Low", "score": -1.5}]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0].score).toBe(1);
      expect(parsed.value_orientation[1].score).toBe(-1);
      expect(Logger.info).toHaveBeenCalledWith(
        "Normalized score at index 0: 2.5 -> 1",
      );
      expect(Logger.info).toHaveBeenCalledWith(
        "Normalized score at index 1: -1.5 -> -1",
      );
    });

    it("should handle valid object with score", () => {
      const input =
        '{"value_orientation":[{"label":"Moderate", "score": 0.2}]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0]).toEqual({
        label: "normalized_moderate",
        score: 0.2,
      });
    });

    it("should log warning and default to Unknown if item is invalid", () => {
      const input = '{"value_orientation":[42]}';
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.value_orientation[0]).toEqual({
        label: "Unknown",
        score: 0.5,
      });
    });
  });

  describe("Default Fields Fallback", () => {
    it("should fill missing defaults", () => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: false,
      } as any);

      const input = "{}";
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.nickname).toBe("");
      expect(parsed.topic_classification).toBe("Unknown");
      expect(parsed.summary).toBe("Analysis completed.");
      expect(parsed.evidence).toEqual([]);
    });

    it("should preserve provided fields", () => {
      vi.mocked(ConfigService.getConfigSync).mockReturnValue({
        enableDebug: false,
      } as any);

      const input = JSON.stringify({
        nickname: "Known",
        topic_classification: "Tech",
        summary: "Good",
        evidence: ["E1", "E2"],
      });
      const result = normalizeAndFixResponse(input);
      const parsed = JSON.parse(result);

      expect(parsed.nickname).toBe("Known");
      expect(parsed.topic_classification).toBe("Tech");
      expect(parsed.summary).toBe("Good");
      expect(parsed.evidence).toEqual(["E1", "E2"]);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMService } from "./LLMService";
import { ConfigService } from "./ConfigService";
import { LabelService } from "./LabelService";
import { I18nService } from "./I18nService";
import { TopicService } from "./TopicService";

// Mock the dependencies
vi.mock("./ConfigService");
vi.mock("./LabelService");
vi.mock("./I18nService");
vi.mock("./TopicService");

describe("LLMService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSystemPrompt", () => {
    it("should generate fast mode prompt with format instructions", () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Politics");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      const prompt = LLMService.getSystemPrompt("fast", "politics");

      expect(prompt).toContain("You are a sociology researcher");
      expect(prompt).toContain("You must format your output as a JSON value");
      expect(prompt).toContain("Current Research Field: 【Politics】");
      expect(prompt).toContain("Mock label library");
      expect(prompt).not.toContain("reasoning");
      expect(prompt).not.toContain("evidence");
    });

    it("should generate balanced mode prompt with reasoning and evidence fields", () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Society");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      const prompt = LLMService.getSystemPrompt("balanced", "society");

      expect(prompt).toContain("You are a sociology researcher");
      expect(prompt).toContain("You must format your output as a JSON value");
      expect(prompt).toContain("reasoning");
      expect(prompt).toContain("evidence");
      expect(prompt).toContain("Current Research Field: 【Society】");
      expect(prompt).toContain("Mock label library");
    });

    it("should generate deep mode prompt with additional deep analysis instruction", () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Technology");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      const prompt = LLMService.getSystemPrompt("deep", "technology");

      expect(prompt).toContain("You are a sociology researcher");
      expect(prompt).toContain("You must format your output as a JSON value");
      expect(prompt).toContain("reasoning");
      expect(prompt).toContain("evidence");
      expect(prompt).toContain("【Deep Mode】");
      expect(prompt).toContain("Current Research Field: 【Technology】");
      expect(prompt).toContain("Mock label library");
    });

    it("should include few-shot examples in balanced mode", () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Politics");
      I18nService.getLanguage = vi.fn().mockReturnValue("en-US");

      const prompt = LLMService.getSystemPrompt("balanced", "politics");

      expect(prompt).toContain("【Few-Shot Examples】");
      expect(prompt).toContain("Text:");
    });

    it("should include Chinese examples when language is zh-CN", () => {
      // Mock the dependencies
      const mockLabelService = {
        refreshCategories: vi.fn(),
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library"),
      };
      LabelService.getInstance = vi.fn().mockReturnValue(mockLabelService);
      TopicService.getCategoryName = vi.fn().mockReturnValue("Politics");
      I18nService.getLanguage = vi.fn().mockReturnValue("zh-CN");

      const prompt = LLMService.getSystemPrompt("balanced", "politics");

      expect(prompt).toContain("【Few-Shot Examples】");
      expect(prompt).toContain("文本:");
    });
  });

  describe("getParserInstructions", () => {
    it("should return format instructions for fast mode", () => {
      const instructions = LLMService.getParserInstructions("fast");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).not.toContain("reasoning");
      expect(instructions).not.toContain("evidence");
    });

    it("should return format instructions for balanced mode", () => {
      const instructions = LLMService.getParserInstructions("balanced");
      expect(instructions).toContain("nickname");
      expect(instructions).toContain("topic_classification");
      expect(instructions).toContain("value_orientation");
      expect(instructions).toContain("summary");
      expect(instructions).toContain("reasoning");
      expect(instructions).toContain("evidence");
    });
  });

  describe("provider configuration", () => {
    it("should throw missing api key error before creating provider", async () => {
      (ConfigService.getConfig as any).mockResolvedValue({
        selectedProvider: "openai",
        apiKeys: {},
        customBaseUrls: {},
        customModelNames: {},
        analysisMode: "balanced",
        enableDebug: false,
        platformAnalysisModes: {},
      });
      (I18nService.t as any).mockReturnValue("missing key");

      await expect(LLMService.generateRawText("test")).rejects.toThrow(
        "missing key",
      );
    });
  });

  describe("content safety fallback", () => {
    const buildConfig = () => ({
      selectedProvider: "qwen",
      apiKeys: { qwen: "test-key" },
      customBaseUrls: {},
      customModelNames: {},
      analysisMode: "balanced",
      enableDebug: false,
      platformAnalysisModes: { zhihu: "balanced" },
    });

    it("retries generateRawText once with sanitized input after content safety block", async () => {
      const provider = {
        generateRawText: vi
          .fn()
          .mockRejectedValueOnce(
            new Error(
              "400 Input data may contain inappropriate content, please check.",
            ),
          )
          .mockResolvedValueOnce("safe reply"),
        generateProfile: vi.fn(),
      };

      (ConfigService.getConfig as any).mockResolvedValue(buildConfig());
      vi.spyOn(LLMService as any, "getProviderInstance").mockReturnValue(
        provider,
      );
      (I18nService.t as any).mockReturnValue("content filter failed");

      const result = await LLMService.generateRawText("台湾 需要讨论");

      expect(result).toBe("safe reply");
      expect(provider.generateRawText).toHaveBeenCalledTimes(2);
      expect(provider.generateRawText.mock.calls[0][0]).toBe("台湾 需要讨论");
      expect(provider.generateRawText.mock.calls[1][0]).toContain("TW");
    });

    it("throws unified actionable content filter error after retries exhausted", async () => {
      const provider = {
        generateRawText: vi
          .fn()
          .mockRejectedValue(
            new Error("data_inspection_failed: content moderation blocked"),
          ),
        generateProfile: vi.fn(),
      };

      (ConfigService.getConfig as any).mockResolvedValue(buildConfig());
      vi.spyOn(LLMService as any, "getProviderInstance").mockReturnValue(
        provider,
      );
      (I18nService.t as any).mockReturnValue("content filter failed");

      await expect(LLMService.generateRawText("test")).rejects.toThrow(
        "content filter failed (auto-handled attempts: 2)",
      );
      expect(provider.generateRawText).toHaveBeenCalledTimes(2);
    });

    it("sanitizes generateProfileForPlatform input before provider call", async () => {
      const provider = {
        generateRawText: vi.fn(),
        generateProfile: vi.fn().mockResolvedValue({
          content: { summary: "ok" },
          durationMs: 10,
          model: "qwen-turbo",
        }),
      };

      (ConfigService.getConfig as any).mockResolvedValue(buildConfig());
      vi.spyOn(LLMService as any, "getProviderInstance").mockReturnValue(
        provider,
      );

      await LLMService.generateProfileForPlatform("台湾 香港", "general", "zhihu");

      expect(provider.generateProfile).toHaveBeenCalledTimes(1);
      expect(provider.generateProfile.mock.calls[0][0]).toContain("TW");
      expect(provider.generateProfile.mock.calls[0][0]).toContain("HK");
    });
  });

  describe("normalizeLabelId", () => {
    it("should normalize common label variations correctly", () => {
      const testCases = [
        { input: "nationalism_globalism", expected: "geopolitics" },
        {
          input: "individualism_vs_collectivism",
          expected: "individualism_vs_collectivism",
        },
        {
          input: "competition_vs_equality",
          expected: "competition_vs_equality",
        },
        { input: "liberty_order", expected: "authority" },
        { input: "tradition_change", expected: "change" },
        { input: "authoritarian_hierarchy", expected: "authority" },
        { input: "innovation_vs_security", expected: "innovation_vs_security" },
        { input: "ideology", expected: "ideology" },
        { input: "open_vs_closed", expected: "open_vs_closed" },
        { input: "speculation_vs_value", expected: "speculation_vs_value" },
        { input: "elite_vs_grassroots", expected: "elite_vs_grassroots" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(LLMService.normalizeLabelId(input)).toBe(expected);
      });
    });
  });
});

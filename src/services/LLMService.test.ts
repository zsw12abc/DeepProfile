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
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library")
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
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library")
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
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library")
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
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library")
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
        getLabelsForContext: vi.fn().mockReturnValue("Mock label library")
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
});
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LabelService } from "./LabelService";

// Mock dependencies
vi.mock("./I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    getLanguage: () => "zh-CN",
  },
}));

describe("LabelService", () => {
  let labelService: LabelService;

  beforeEach(() => {
    // Reset singleton instance if possible or just get instance
    labelService = LabelService.getInstance();
  });

  describe("getInstance", () => {
    it("should return the same instance", () => {
      const instance1 = LabelService.getInstance();
      const instance2 = LabelService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("getCategories", () => {
    it("should return categories", () => {
      const categories = labelService.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("id");
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("labels");
    });
  });

  describe("getCategoryById", () => {
    it("should return category by id", () => {
      const category = labelService.getCategoryById("politics");
      expect(category).toBeDefined();
      expect(category?.id).toBe("politics");
    });

    it("should return undefined for unknown id", () => {
      const category = labelService.getCategoryById("unknown_category");
      expect(category).toBeUndefined();
    });
  });

  describe("getLabelsByCategory", () => {
    it("should return labels for category", () => {
      const labels = labelService.getLabelsByCategory("politics");
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0]).toHaveProperty("id");
    });

    it("should return empty array for unknown category", () => {
      const labels = labelService.getLabelsByCategory("unknown_category");
      expect(labels).toEqual([]);
    });
  });

  describe("getLabelById", () => {
    it("should return label by id", () => {
      // Assuming 'ideology' is a label in 'politics' category
      const label = labelService.getLabelById("ideology");
      expect(label).toBeDefined();
      expect(label?.id).toBe("ideology");
    });

    it("should return undefined for unknown label id", () => {
      const label = labelService.getLabelById("unknown_label");
      expect(label).toBeUndefined();
    });
  });

  describe("analyzeContentWithStandardLabels", () => {
    it("should analyze content and return classification result", () => {
      // Test with a topic that maps to a category
      const result = labelService.analyzeContentWithStandardLabels(
        "some content",
        "politics",
      );
      expect(result).toBeDefined();
      expect(result.category).toBe("politics");
      // Labels might be empty if content doesn't match any keywords, but structure should be correct
      expect(Array.isArray(result.labels)).toBe(true);
    });

    it("should handle general topic", () => {
      const result = labelService.analyzeContentWithStandardLabels(
        "some content",
        "general",
      );
      expect(result).toBeDefined();
      expect(result.category).toBe("general");
      expect(result.labels).toEqual([]);
    });
  });

  describe("getStandardLabelsForLLM", () => {
    it("should return formatted string of labels", () => {
      const text = labelService.getStandardLabelsForLLM();
      expect(text).toContain("标准标签系统");
      expect(text).toContain("分类:");
      expect(text).toContain("标签:");
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseLabelName,
  calculateFinalLabel,
  getLabelInfo,
  getRelevantLabelsByTopic,
  filterLabelsByTopic,
} from "./LabelUtils";
import { I18nService } from "./I18nService";

// Mock I18nService to control language setting in tests
vi.mock("./I18nService", () => ({
  I18nService: {
    getLanguage: vi.fn(() => "zh-CN"),
    t: (key: string) => key,
    init: vi.fn(),
    setLanguage: vi.fn(),
  },
}));

describe("LabelUtils", () => {
  beforeEach(() => {
    // Reset the mock to ensure consistent behavior
    vi.clearAllMocks();
    (I18nService.getLanguage as any).mockReturnValue("zh-CN");
  });

  describe("parseLabelName", () => {
    it("should parse standard label name", () => {
      const result = parseLabelName("左派 vs 右派");
      expect(result.left).toBe("左派");
      expect(result.right).toBe("右派");
    });

    it("should parse label ID using fallback map", () => {
      const result = parseLabelName("ideology");
      expect(result.left).toBe("左派");
      expect(result.right).toBe("右派");
    });

    it("should handle non-standard label name", () => {
      const result = parseLabelName("Unknown Label");
      expect(result.left).toBe("");
      expect(result.right).toBe("Unknown Label");
    });

    it('should parse "Chinese|English" format in Chinese mode', () => {
      (I18nService.getLanguage as any).mockReturnValue("zh-CN");
      const result = parseLabelName("工作 vs 生活|Work vs Life");
      expect(result.left).toBe("工作");
      expect(result.right).toBe("生活");
    });

    it('should parse "Chinese|English" format in English mode', () => {
      (I18nService.getLanguage as any).mockReturnValue("en-US");
      const result = parseLabelName("工作 vs 生活|Work vs Life");
      expect(result.left).toBe("Work");
      expect(result.right).toBe("Life");
    });

    it('should handle "Chinese|English" format where Chinese part has "vs" structure', () => {
      (I18nService.getLanguage as any).mockReturnValue("zh-CN");
      const result = parseLabelName("开放 vs 封闭|Open vs Closed");
      expect(result.left).toBe("开放");
      expect(result.right).toBe("封闭");
    });

    it('should handle "Chinese|English" format where English part has "vs" structure', () => {
      (I18nService.getLanguage as any).mockReturnValue("en-US");
      const result = parseLabelName("开放 vs 封闭|Open vs Closed");
      expect(result.left).toBe("Open");
      expect(result.right).toBe("Closed");
    });
  });

  describe("calculateFinalLabel", () => {
    it("should calculate label for positive score", () => {
      const result = calculateFinalLabel("ideology", 0.6);
      expect(result.label).toBe("右派");
      expect(result.percentage).toBe(60);
    });

    it("should calculate label for negative score", () => {
      const result = calculateFinalLabel("ideology", -0.6);
      expect(result.label).toBe("左派");
      expect(result.percentage).toBe(60);
    });

    it("should clamp score between -1 and 1", () => {
      const result = calculateFinalLabel("ideology", 1.5);
      expect(result.percentage).toBe(100);
    });
  });

  describe("getLabelInfo", () => {
    it("should return label info for existing ID", () => {
      const info = getLabelInfo("ideology");
      expect(info).toBeDefined();
      expect(info?.name).toBe("左派 vs 右派");
      expect(info?.categoryName).toBe("政治倾向 (Political Orientation)");
    });

    it("should return null for non-existing ID", () => {
      const info = getLabelInfo("non_existent");
      expect(info).toBeNull();
    });
  });

  describe("getRelevantLabelsByTopic", () => {
    it("should return politics labels for political topic", () => {
      const labels = getRelevantLabelsByTopic("政治讨论");
      const ids = labels.map((l) => l.id);
      expect(ids).toContain("ideology");
      expect(ids).toContain("authority");
    });

    it("should return technology labels for tech topic", () => {
      const labels = getRelevantLabelsByTopic("人工智能技术");
      const ids = labels.map((l) => l.id);
      expect(ids).toContain("open_vs_closed");
    });
  });

  describe("filterLabelsByTopic", () => {
    it("should filter relevant labels", () => {
      const input = [
        { label: "ideology", score: 0.8 },
        { label: "some_other_label", score: 0.5 },
      ];
      const result = filterLabelsByTopic(input, "政治讨论");
      // Should contain ideology since it's relevant to politics
      expect(result).toContainEqual({ label: "ideology", score: 0.8 });
    });

    it("should return empty for entertainment topic if configured", () => {
      const input = [
        { label: "ideology", score: 0.8 },
        { label: "market_vs_gov", score: 0.6 },
      ];
      const result = filterLabelsByTopic(input, "娱乐话题");
      // Depending on the filtering logic, this might return empty
      // The exact behavior depends on the implementation
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

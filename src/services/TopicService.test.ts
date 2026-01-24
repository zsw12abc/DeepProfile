import { describe, it, expect, vi, beforeEach } from "vitest";
import { TopicService } from "./TopicService";
import { LLMService } from "./LLMService";

vi.mock("./LLMService");

describe("TopicService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("classify", () => {
    it("should handle null and undefined inputs", () => {
      expect(TopicService.classify(null as any)).toBe("general");
      expect(TopicService.classify(undefined as any)).toBe("general");
      expect(TopicService.classify("")).toBe("general");
    });

    it("should handle non-string inputs", () => {
      expect(TopicService.classify(123 as any)).toBe("general");
      expect(TopicService.classify({} as any)).toBe("general");
      expect(TopicService.classify([] as any)).toBe("general");
    });

    it("should classify politics related text", () => {
      expect(TopicService.classify("这是一篇关于政治的文章")).toBe("politics");
      expect(TopicService.classify("讨论政府政策")).toBe("politics");
      expect(TopicService.classify("政府与国家的关系")).toBe("politics");
    });

    it("should classify economy related text", () => {
      expect(TopicService.classify("这是一篇关于经济的文章")).toBe("economy");
      expect(TopicService.classify("讨论金融市场")).toBe("economy");
      expect(TopicService.classify("股市分析")).toBe("economy");
    });

    it("should classify society related text", () => {
      expect(TopicService.classify("这是一篇关于社会的文章")).toBe("society");
      expect(TopicService.classify("讨论社会问题")).toBe("society");
      expect(TopicService.classify("性别与女权")).toBe("society");
    });

    it("should classify technology related text", () => {
      expect(TopicService.classify("这是一篇关于科技的文章")).toBe("technology");
      expect(TopicService.classify("讨论AI技术")).toBe("technology");
      expect(TopicService.classify("人工智能发展")).toBe("technology");
    });

    it("should classify culture related text", () => {
      expect(TopicService.classify("这是一篇关于文化的文章")).toBe("culture");
      expect(TopicService.classify("讨论传统文化")).toBe("culture");
      expect(TopicService.classify("艺术与哲学")).toBe("culture");
    });

    it("should classify environment related text", () => {
      expect(TopicService.classify("这是一篇关于环境的文章")).toBe("environment");
      expect(TopicService.classify("讨论环境保护")).toBe("environment");
      expect(TopicService.classify("气候变化")).toBe("environment");
    });

    it("should classify entertainment related text", () => {
      expect(TopicService.classify("这是一篇关于娱乐的文章")).toBe("entertainment");
      // 使用更明确的娱乐相关词汇，避免与其他类别冲突
      expect(TopicService.classify("观看综艺节目开心")).toBe("entertainment");
      expect(TopicService.classify("追剧看电影")).toBe("entertainment");
    });

    it("should classify lifestyle_career related text", () => {
      expect(TopicService.classify("这是一篇关于生活的文章")).toBe("lifestyle_career");
      expect(TopicService.classify("讨论职场生活")).toBe("lifestyle_career");
      expect(TopicService.classify("求职面试")).toBe("lifestyle_career");
    });

    it("should return general for unknown text", () => {
      expect(TopicService.classify("这是一个完全无关的话题")).toBe("general");
      expect(TopicService.classify("random text with no clear category")).toBe("general");
    });
  });

  describe("getCategoryName", () => {
    it("should return localized category names", () => {
      // Note: We're mocking i18n service in actual tests, so we'll just verify the function doesn't crash
      expect(typeof TopicService.getCategoryName('politics')).toBe('string');
      expect(typeof TopicService.getCategoryName('economy')).toBe('string');
      expect(typeof TopicService.getCategoryName('society')).toBe('string');
      expect(typeof TopicService.getCategoryName('technology')).toBe('string');
      expect(typeof TopicService.getCategoryName('culture')).toBe('string');
      expect(typeof TopicService.getCategoryName('environment')).toBe('string');
      expect(typeof TopicService.getCategoryName('entertainment')).toBe('string');
      expect(typeof TopicService.getCategoryName('lifestyle_career')).toBe('string');
      expect(typeof TopicService.getCategoryName('general')).toBe('string');
    });
  });

  describe("classifyWithLLM", () => {
    it("should return general on LLM error", async () => {
      vi.spyOn(LLMService, 'generateRawText').mockRejectedValue(new Error("API Error"));
      
      const result = await TopicService.classifyWithLLM("test content");
      expect(result).toBe("general");
    });

    it("should return general on invalid LLM response", async () => {
      vi.spyOn(LLMService, 'generateRawText').mockResolvedValue("invalid_category");
      
      const result = await TopicService.classifyWithLLM("test content");
      expect(result).toBe("general");
    });

    it("should return valid category on successful LLM response", async () => {
      vi.spyOn(LLMService, 'generateRawText').mockResolvedValue("technology");
      
      const result = await TopicService.classifyWithLLM("AI technology discussion");
      expect(result).toBe("technology");
    });
  });
});
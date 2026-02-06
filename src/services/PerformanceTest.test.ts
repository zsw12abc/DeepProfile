import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PerformanceTest } from "./PerformanceTest";
import { LLMService } from "./LLMService";

// Mock LLMService
vi.mock("./LLMService", () => ({
  LLMService: {
    generateProfile: vi.fn(),
  },
}));

describe("PerformanceTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("testPerformance", () => {
    it("should run performance tests for all modes and categories", async () => {
      // Mock generateProfile to return a dummy result
      vi.mocked(LLMService.generateProfile).mockResolvedValue({
        content: { summary: "Test summary" },
        durationMs: 100,
        model: "test-model",
        usage: { total_tokens: 100 },
      } as any);

      await PerformanceTest.testPerformance();

      // Check if generateProfile was called for each category (3) * each mode (3) = 9 times
      expect(LLMService.generateProfile).toHaveBeenCalledTimes(9);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(LLMService.generateProfile).mockRejectedValue(
        new Error("Test error"),
      );

      await expect(PerformanceTest.testPerformance()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("batchPerformanceTest", () => {
    it("should run batch performance tests", async () => {
      vi.mocked(LLMService.generateProfile).mockResolvedValue({
        content: { summary: "Test summary" },
        durationMs: 100,
        model: "test-model",
        usage: { total_tokens: 100 },
      } as any);

      await PerformanceTest.batchPerformanceTest();

      // 5 iterations * 2 modes (fast, balanced) = 10 calls
      expect(LLMService.generateProfile).toHaveBeenCalledTimes(10);
    });
  });
});

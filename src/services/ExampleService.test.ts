import { describe, it, expect, beforeEach } from "vitest";
import { ExampleService } from "./ExampleService";
import { MacroCategory } from "~types";

describe("ExampleService", () => {
  let exampleService: ExampleService;

  beforeEach(() => {
    exampleService = ExampleService.getInstance();
  });

  it("should initialize with examples", () => {
    const examples = exampleService["examples"];
    expect(examples).toBeDefined();
    expect(examples.length).toBeGreaterThan(0);
  });

  it("should retrieve relevant examples for politics category", () => {
    const inputContent =
      "政府应该减少对市场的干预，让企业和个人有更多的自由来创造财富";
    const category: MacroCategory = "politics";

    const relevantExamples = exampleService.getRelevantExamples(
      inputContent,
      category,
      "balanced",
      2,
    );

    expect(relevantExamples).toBeDefined();
    expect(relevantExamples.length).toBeLessThanOrEqual(2);
  });

  it("should retrieve relevant examples for economy category", () => {
    const inputContent = "自由市场是推动经济增长的最佳方式。竞争促使企业创新";
    const category: MacroCategory = "economy";

    const relevantExamples = exampleService.getRelevantExamples(
      inputContent,
      category,
      "balanced",
      2,
    );

    expect(relevantExamples).toBeDefined();
    expect(relevantExamples.length).toBeLessThanOrEqual(2);
  });

  it("should calculate relevance scores", () => {
    const inputContent = "自由市场是推动经济增长的最佳方式";
    const exampleContent = "自由市场是推动经济增长的最佳方式。竞争促使企业创新";

    // Access private method for testing
    const relevanceScore = (exampleService as any).calculateRelevanceScore(
      inputContent,
      exampleContent,
    );

    expect(relevanceScore).toBeGreaterThanOrEqual(0);
    expect(relevanceScore).toBeLessThanOrEqual(1);
    expect(relevanceScore).toBeGreaterThan(0.5); // Should have high relevance
  });

  it("should format examples as prompt", () => {
    const inputContent = "政府应该减少对市场的干预";
    const category: MacroCategory = "politics";
    const examples = exampleService.getRelevantExamples(
      inputContent,
      category,
      "balanced",
      1,
    );

    const formattedPrompt = exampleService.formatExamplesAsPrompt(
      examples,
      "balanced",
    );

    expect(formattedPrompt).toContain("【Few-Shot Examples】");
    if (examples.length > 0) {
      expect(formattedPrompt).toContain(examples[0].content);
    }
  });
});

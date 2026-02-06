import { describe, it, expect, beforeAll } from "vitest";
import { ConsistencyService } from "./ConsistencyService";
import { calculateFinalLabel } from "./LabelUtils";
import { I18nService } from "./I18nService";

describe("LLM golden regression samples", () => {
  beforeAll(() => {
    I18nService.setLanguage("zh-CN");
  });

  const samples = [
    { label: "ideology", score: 0.8, intensity: "明显" },
    { label: "authority", score: 0.6, intensity: "较为" },
    { label: "market_vs_gov", score: -0.35, intensity: "略偏" },
    { label: "individualism_vs_collectivism", score: 0.75, intensity: "明显" },
    { label: "open_vs_closed", score: 0.5, intensity: "较为" },
    { label: "local_vs_global", score: -0.4, intensity: "略偏" },
    { label: "protection_vs_development", score: 0.7, intensity: "明显" },
    { label: "2d_vs_3d", score: -0.55, intensity: "较为" },
    { label: "frugal_vs_luxury", score: 0.3, intensity: "略偏" },
    { label: "stable_vs_risk", score: -0.8, intensity: "明显" },
  ];

  samples.forEach((sample) => {
    it(`aligns summary for ${sample.label}`, () => {
      const expected = calculateFinalLabel(sample.label, sample.score).label;
      const profile = {
        value_orientation: [{ label: sample.label, score: sample.score }],
        summary: "用户总体特征较为平实。",
      };

      const aligned = ConsistencyService.enforceSummaryAlignment(
        profile as any,
        "balanced",
      );
      expect(aligned.summary).toContain(sample.intensity);
      expect(aligned.summary).toContain(expected);
    });
  });
});

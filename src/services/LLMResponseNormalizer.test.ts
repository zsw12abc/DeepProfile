import { describe, it, expect, vi } from "vitest";
import { normalizeAndFixResponse } from "./LLMResponseNormalizer";
import { ConfigService } from "./ConfigService";

vi.mock("./ConfigService", () => ({
  ConfigService: {
    getConfigSync: vi.fn()
  }
}));

describe("LLMResponseNormalizer", () => {
  it("normalizes fenced json and clamps scores", () => {
    vi.mocked(ConfigService.getConfigSync).mockReturnValue({ enableDebug: false } as any);
    const input = "```json\n{\"nickname\":\"n\",\"value_orientation\":[{\"label\":\"discipline_vs_hedonism\",\"score\":2}],\"summary\":\"ok\"}\n```";
    const result = normalizeAndFixResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed.nickname).toBe("n");
    expect(parsed.value_orientation[0].score).toBe(1);
  });

  it("falls back to political_leaning when value_orientation is missing", () => {
    vi.mocked(ConfigService.getConfigSync).mockReturnValue({ enableDebug: false } as any);
    const input = "{\"nickname\":\"n\",\"political_leaning\":[\"discipline_vs_hedonism\"],\"summary\":\"ok\"}";
    const result = normalizeAndFixResponse(input);
    const parsed = JSON.parse(result);
    expect(parsed.value_orientation).toHaveLength(1);
    expect(parsed.value_orientation[0].score).toBe(0.5);
  });

  it("returns fallback when response is not json", () => {
    vi.mocked(ConfigService.getConfigSync).mockImplementation(() => {
      throw new Error("no config");
    });
    const result = normalizeAndFixResponse("not json");
    const parsed = JSON.parse(result);
    expect(parsed.summary).toBe("Analysis Failed");
  });
});

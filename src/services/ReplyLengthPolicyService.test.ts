import { describe, expect, it } from "vitest";
import { ReplyLengthPolicyService } from "./ReplyLengthPolicyService";

describe("ReplyLengthPolicyService", () => {
  it("returns 280 limit for twitter and null for others", () => {
    expect(ReplyLengthPolicyService.getPlatformLimit("twitter")).toBe(280);
    expect(ReplyLengthPolicyService.getPlatformLimit("reddit")).toBeNull();
  });

  it("counts and trims twitter text using weighted rules", () => {
    const text = "hello ".repeat(60);
    const before = ReplyLengthPolicyService.countForPlatform(text, "twitter");
    expect(before.method).toBe("x_weighted");
    expect(before.count).toBeGreaterThan(280);

    const result = ReplyLengthPolicyService.applyLimit(text, "twitter");
    expect(result.wasTrimmed).toBe(true);
    expect(result.limit).toBe(280);
    expect(result.finalCount).toBeLessThanOrEqual(280);
  });

  it("handles emoji and url within twitter weighted count", () => {
    const text =
      "😀😀😀 Check this https://example.com/very/long/path?query=1 ".repeat(20);
    const result = ReplyLengthPolicyService.applyLimit(text, "twitter");
    expect(result.countMethod).toBe("x_weighted");
    expect(result.finalCount).toBeLessThanOrEqual(280);
  });
});


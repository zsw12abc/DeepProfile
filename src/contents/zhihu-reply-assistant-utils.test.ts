import { describe, expect, it } from "vitest";
import {
  clampFloatingBallPos,
  computeFloatingPanelPosition,
  isDarkThemeId,
} from "./zhihu-reply-assistant-utils";

describe("zhihu-reply-assistant-utils", () => {
  it("clamps floating ball into viewport", () => {
    const result = clampFloatingBallPos(
      { left: -50, top: 900 },
      { width: 800, height: 600 },
      38,
      8,
    );

    expect(result.left).toBe(8);
    expect(result.top).toBe(554);
  });

  it("places panel on the right when there is space", () => {
    const pos = computeFloatingPanelPosition(
      { left: 120, top: 120 },
      { width: 1400, height: 900 },
      { width: 360, height: 620 },
      38,
      10,
      10,
    );

    expect(pos.left).toBeGreaterThan(120);
  });

  it("places panel on the left when right side is tight", () => {
    const pos = computeFloatingPanelPosition(
      { left: 1280, top: 120 },
      { width: 1400, height: 900 },
      { width: 360, height: 620 },
      38,
      10,
      10,
    );

    expect(pos.left).toBeLessThan(1200);
  });

  it("keeps panel within vertical bounds", () => {
    const pos = computeFloatingPanelPosition(
      { left: 40, top: 860 },
      { width: 1200, height: 900 },
      { width: 360, height: 620 },
      38,
      10,
      10,
    );

    expect(pos.top).toBeGreaterThanOrEqual(10);
    expect(pos.top).toBeLessThanOrEqual(270);
  });

  it("detects dark theme ids", () => {
    expect(isDarkThemeId("future-night")).toBe(true);
    expect(isDarkThemeId("zhihu-black")).toBe(true);
    expect(isDarkThemeId("future-day")).toBe(false);
  });
});

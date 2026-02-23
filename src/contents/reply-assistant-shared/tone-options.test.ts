import { describe, expect, it } from "vitest";
import {
  EN_TONE_OPTIONS,
  ZH_TONE_OPTIONS,
  INLINE_CONTAINER_CLASS,
  INLINE_LENGTH_CLASS,
  INLINE_REPLY_BTN_CLASS,
  INLINE_TONE_CLASS,
} from "./tone-options";

describe("tone-options", () => {
  it("keeps extended EN tones at the front", () => {
    expect(EN_TONE_OPTIONS.slice(0, 4)).toEqual([
      "Troll",
      "Forum Meme Lord",
      "Classic Public Intellectual",
      "Deconstructive Parody",
    ]);
  });

  it("keeps extended ZH tones at the front", () => {
    expect(ZH_TONE_OPTIONS.slice(0, 4)).toEqual([
      "巨魔风格 (Troll)",
      "贴吧大神风格",
      "古早公知风格",
      "当代衍生变体",
    ]);
  });

  it("exports stable inline class names", () => {
    expect(INLINE_REPLY_BTN_CLASS).toBe("deep-profile-inline-reply-btn");
    expect(INLINE_TONE_CLASS).toBe("deep-profile-inline-tone-select");
    expect(INLINE_CONTAINER_CLASS).toBe("deep-profile-inline-controls");
    expect(INLINE_LENGTH_CLASS).toBe("deep-profile-inline-length-select");
  });
});

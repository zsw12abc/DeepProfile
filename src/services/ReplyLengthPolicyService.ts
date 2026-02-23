import * as twitterText from "twitter-text";
import type { SupportedPlatform } from "~types";

export type ReplyLengthCountMethod = "x_weighted" | "plain";

export interface ReplyLengthPolicyResult {
  text: string;
  wasTrimmed: boolean;
  limit: number | null;
  countMethod: ReplyLengthCountMethod;
  originalCount: number;
  finalCount: number;
}

export class ReplyLengthPolicyService {
  static getPlatformLimit(
    platform: SupportedPlatform,
    _surface: "reply" | "post" | "quote" = "reply",
  ): number | null {
    if (platform === "twitter") return 280;
    return null;
  }

  static countForPlatform(
    text: string,
    platform: SupportedPlatform,
  ): { count: number; method: ReplyLengthCountMethod } {
    if (platform === "twitter") {
      const parsed = twitterText.parseTweet(text || "");
      return { count: parsed.weightedLength, method: "x_weighted" };
    }
    return { count: Array.from(text || "").length, method: "plain" };
  }

  static applyLimit(
    text: string,
    platform: SupportedPlatform,
    surface: "reply" | "post" | "quote" = "reply",
  ): ReplyLengthPolicyResult {
    const input = text || "";
    const limit = this.getPlatformLimit(platform, surface);
    const { count: originalCount, method } = this.countForPlatform(
      input,
      platform,
    );

    if (!limit || originalCount <= limit) {
      return {
        text: input,
        wasTrimmed: false,
        limit,
        countMethod: method,
        originalCount,
        finalCount: originalCount,
      };
    }

    const trimmed = this.trimToLimit(input, platform, limit);
    const { count: finalCount } = this.countForPlatform(trimmed, platform);

    return {
      text: trimmed,
      wasTrimmed: true,
      limit,
      countMethod: method,
      originalCount,
      finalCount,
    };
  }

  static trimToLimit(
    text: string,
    platform: SupportedPlatform,
    limit: number,
  ): string {
    if (!text) return "";

    const chars = Array.from(text);
    let low = 0;
    let high = chars.length;
    let best = "";

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = chars.slice(0, mid).join("");
      const { count } = this.countForPlatform(candidate, platform);

      if (count <= limit) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best;
  }
}


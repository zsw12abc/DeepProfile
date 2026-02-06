import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, withTimeout } from "./LLMRetry";

describe("LLMRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves within timeout", async () => {
    const promise = Promise.resolve("ok");
    await expect(withTimeout(promise, 1000)).resolves.toBe("ok");
  });

  it("rejects when timeout elapses", async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve("late"), 2000);
    });

    const timed = withTimeout(promise, 500);
    vi.advanceTimersByTime(500);

    await expect(timed).rejects.toThrow("LLM request timeout");
  });

  it("retries until success", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");

    const resultPromise = withRetry(fn, {
      retries: 2,
      baseDelayMs: 10,
      shouldRetry: () => true
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));

    await expect(withRetry(fn, {
      retries: 2,
      baseDelayMs: 10,
      shouldRetry: () => false
    })).rejects.toThrow("nope");
  });
});

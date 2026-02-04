import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInjectionScheduler } from "./injection-utils";

describe("createInjectionScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false
    });
  });

  it("should pause scheduling when document is hidden and resume on visibility change", () => {
    const injectButtons = vi.fn();
    const scheduler = createInjectionScheduler({
      injectButtons,
      shouldProcess: () => true,
      debounceMs: 10
    });

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true
    });

    scheduler.start(document.body);
    vi.runAllTimers();
    expect(injectButtons).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();

    expect(injectButtons).toHaveBeenCalledTimes(1);
  });

  it("should stop scheduling after stop is called", () => {
    const injectButtons = vi.fn();
    const scheduler = createInjectionScheduler({
      injectButtons,
      shouldProcess: () => true,
      debounceMs: 10
    });

    scheduler.start(document.body);
    scheduler.stop();

    document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();

    expect(injectButtons).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger } from "./Logger";
import { ConfigService } from "./ConfigService";

vi.mock("./ConfigService", () => ({
  ConfigService: {
    getConfigSync: vi.fn(),
  },
}));

describe("Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs debug/info when enableDebug is true", () => {
    vi.mocked(ConfigService.getConfigSync).mockReturnValue({
      enableDebug: true,
    } as any);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    Logger.debug("debug");
    Logger.info("info");

    expect(debugSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it("skips debug/info when enableDebug is false", () => {
    vi.mocked(ConfigService.getConfigSync).mockReturnValue({
      enableDebug: false,
    } as any);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    Logger.debug("debug");
    Logger.info("info");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("always logs warn/error", () => {
    vi.mocked(ConfigService.getConfigSync).mockReturnValue({
      enableDebug: false,
    } as any);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    Logger.warn("warn");
    Logger.error("error");

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});

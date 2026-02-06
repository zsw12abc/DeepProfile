import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelemetryService } from "./TelemetryService";
import { ConfigService } from "./ConfigService";

vi.mock("./ConfigService", () => ({
  ConfigService: {
    getConfig: vi.fn()
  }
}));

const createStorageMock = () => {
  const data: Record<string, any> = {};
  return {
    data,
    get: vi.fn(async (key: string) => ({ [key]: data[key] })),
    set: vi.fn(async (obj: Record<string, any>) => {
      Object.assign(data, obj);
    })
  };
};

describe("TelemetryService", () => {
  const originalEnv = process.env.NODE_ENV;
  let storageMock: ReturnType<typeof createStorageMock>;
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    storageMock = createStorageMock();
    (global as any).chrome = {
      storage: {
        local: storageMock
      }
    };
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("does not record in production without consent", async () => {
    process.env.NODE_ENV = "production";
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      observability: {
        errorMonitoringEnabled: true,
        analyticsEnabled: true,
        performanceMonitoringEnabled: true,
        complianceMonitoringEnabled: true,
        allowInProd: false,
        prodConsent: false,
        endpoint: "",
        sampleRate: 1,
        maxQueueSize: 200
      }
    } as any);

    await TelemetryService.recordEvent("test_event");
    expect(storageMock.set).not.toHaveBeenCalled();
  });

  it("records events in development when enabled", async () => {
    process.env.NODE_ENV = "development";
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      observability: {
        errorMonitoringEnabled: true,
        analyticsEnabled: true,
        performanceMonitoringEnabled: false,
        complianceMonitoringEnabled: false,
        allowInProd: false,
        prodConsent: false,
        endpoint: "",
        sampleRate: 1,
        maxQueueSize: 200
      }
    } as any);

    await TelemetryService.recordEvent("analysis_button_clicked", { platform: "zhihu" });
    expect(storageMock.set).toHaveBeenCalled();
    const stored = storageMock.data["deep_profile_telemetry"] as any[];
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("analysis_button_clicked");
  });

  it("flushes queue when endpoint is configured", async () => {
    process.env.NODE_ENV = "development";
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      observability: {
        errorMonitoringEnabled: false,
        analyticsEnabled: true,
        performanceMonitoringEnabled: false,
        complianceMonitoringEnabled: false,
        allowInProd: false,
        prodConsent: false,
        endpoint: "https://example.com/ingest",
        sampleRate: 1,
        maxQueueSize: 200
      }
    } as any);

    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

    await TelemetryService.recordEvent("event_flush");

    expect(global.fetch).toHaveBeenCalled();
    const stored = storageMock.data["deep_profile_telemetry"] as any[];
    expect(stored).toEqual([]);
  });

  it("skips sampling when sampleRate is zero", async () => {
    process.env.NODE_ENV = "development";
    randomSpy.mockReturnValue(0.5);
    vi.mocked(ConfigService.getConfig).mockResolvedValue({
      observability: {
        errorMonitoringEnabled: true,
        analyticsEnabled: true,
        performanceMonitoringEnabled: true,
        complianceMonitoringEnabled: true,
        allowInProd: false,
        prodConsent: false,
        endpoint: "",
        sampleRate: 0,
        maxQueueSize: 200
      }
    } as any);

    await TelemetryService.recordEvent("sampled_out");
    expect(storageMock.set).not.toHaveBeenCalled();
  });
});

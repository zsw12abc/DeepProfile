import { ConfigService } from "./ConfigService";
import { DEFAULT_CONFIG, type ObservabilityConfig } from "../types";

type TelemetryCategory = "error" | "event" | "performance" | "compliance";

export type TelemetryRecord = {
  id: string;
  category: TelemetryCategory;
  name: string;
  timestamp: number;
  data?: Record<string, any>;
};

const TELEMETRY_STORAGE_KEY = "deep_profile_telemetry";

export class TelemetryService {
  static async recordError(name: string, data?: Record<string, any>): Promise<void> {
    await this.record("error", name, data);
  }

  static async recordEvent(name: string, data?: Record<string, any>): Promise<void> {
    await this.record("event", name, data);
  }

  static async recordPerformance(name: string, data?: Record<string, any>): Promise<void> {
    await this.record("performance", name, data);
  }

  static async recordCompliance(name: string, data?: Record<string, any>): Promise<void> {
    await this.record("compliance", name, data);
  }

  private static async record(category: TelemetryCategory, name: string, data?: Record<string, any>): Promise<void> {
    const config = await this.getObservabilityConfig();
    if (this.isProduction() && (!config.allowInProd || !config.prodConsent)) return;
    if (!this.isEnabled(category, config)) return;
    if (!this.shouldSample(config)) return;

    const record: TelemetryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      category,
      name,
      timestamp: Date.now(),
      data
    };

    await this.enqueue(record, config);
    if (!this.isProduction() && !config.endpoint) {
      try {
        console.info("[Telemetry]", record);
      } catch (e) {
        // Ignore console errors
      }
    }
    await this.flush(config);
  }

  private static async getObservabilityConfig(): Promise<ObservabilityConfig> {
    try {
      const config = await ConfigService.getConfig();
      return { ...DEFAULT_CONFIG.observability, ...(config.observability || {}) };
    } catch (e) {
      return DEFAULT_CONFIG.observability;
    }
  }

  private static isProduction(): boolean {
    const nodeEnv =
      typeof process !== "undefined" && process.env
        ? process.env.NODE_ENV
        : undefined;
    if (nodeEnv) {
      return nodeEnv === "production";
    }
    // When env is unknown, treat as production for safety.
    return true;
  }

  private static isEnabled(category: TelemetryCategory, config: ObservabilityConfig): boolean {
    if (category === "error") return !!config.errorMonitoringEnabled;
    if (category === "event") return !!config.analyticsEnabled;
    if (category === "performance") return !!config.performanceMonitoringEnabled;
    if (category === "compliance") return !!config.complianceMonitoringEnabled;
    return false;
  }

  private static shouldSample(config: ObservabilityConfig): boolean {
    const sampleRate = Math.min(1, Math.max(0, config.sampleRate ?? 1));
    return Math.random() <= sampleRate;
  }

  private static async enqueue(record: TelemetryRecord, config: ObservabilityConfig): Promise<void> {
    if (!chrome?.storage?.local) return;
    try {
      const result = await chrome.storage.local.get(TELEMETRY_STORAGE_KEY);
      const queue = (result[TELEMETRY_STORAGE_KEY] as TelemetryRecord[]) || [];
      queue.push(record);
      const maxQueueSize = Math.max(1, config.maxQueueSize || 200);
      const trimmed = queue.slice(-maxQueueSize);
      await chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: trimmed });
    } catch (e) {
      // Ignore telemetry storage failures
    }
  }

  private static async flush(config: ObservabilityConfig): Promise<void> {
    if (!config.endpoint) return;
    if (!chrome?.storage?.local) return;

    try {
      const result = await chrome.storage.local.get(TELEMETRY_STORAGE_KEY);
      const queue = (result[TELEMETRY_STORAGE_KEY] as TelemetryRecord[]) || [];
      if (queue.length === 0) return;

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: queue })
      });

      if (response.ok) {
        await chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: [] });
      }
    } catch (e) {
      // Keep queued data for next attempt
    }
  }
}

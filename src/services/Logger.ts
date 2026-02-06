import { ConfigService } from "./ConfigService";

type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private static shouldLog(level: LogLevel): boolean {
    if (level === "warn" || level === "error") return true;
    try {
      const config = ConfigService.getConfigSync();
      return Boolean(config.enableDebug);
    } catch {
      return false;
    }
  }

  static debug(...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.debug(...args);
    }
  }

  static info(...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(...args);
    }
  }

  static warn(...args: any[]): void {
    console.warn(...args);
  }

  static error(...args: any[]): void {
    console.error(...args);
  }
}

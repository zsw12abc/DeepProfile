import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Options from "./options";
import { ConfigService } from "./services/ConfigService";
import { HistoryService } from "./services/HistoryService";
import { I18nService } from "./services/I18nService";
import { ThemeService } from "./services/ThemeService";
import { DEFAULT_CONFIG } from "./types";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock chrome API
const mockRuntimeGetURL = vi.fn().mockReturnValue("/assets/icon.png");
const mockRuntimeSendMessage = vi.fn();
const mockRuntimeOnMessageAddListener = vi.fn();
const mockRuntimeOnMessageRemoveListener = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockRuntimeOpenOptionsPage = vi.fn();

Object.defineProperty(global, "chrome", {
  value: {
    runtime: {
      getURL: mockRuntimeGetURL,
      sendMessage: mockRuntimeSendMessage,
      onMessage: {
        addListener: mockRuntimeOnMessageAddListener,
        removeListener: mockRuntimeOnMessageRemoveListener,
      },
      getManifest: vi.fn().mockReturnValue({ version: "0.6.3" }),
      openOptionsPage: mockRuntimeOpenOptionsPage,
    },
    tabs: {
      sendMessage: mockTabsSendMessage,
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
  },
  writable: true,
});

// Mock dependencies
vi.mock("./services/ConfigService", () => ({
  ConfigService: {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
  },
}));

vi.mock("./services/HistoryService", () => ({
  HistoryService: {
    getAllUserRecords: vi.fn(),
    deleteProfile: vi.fn(),
    deleteUserRecord: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock("./services/I18nService", () => ({
  I18nService: {
    t: (key: string) => key,
    setLanguage: vi.fn(),
    getLanguage: () => "zh-CN",
  },
}));

vi.mock("./services/ThemeService", () => ({
  ThemeService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      getCurrentTheme: () => ({
        colors: {},
        typography: {},
        spacing: {},
        borderRadius: {},
        shadows: {},
      }),
    }),
  },
}));

vi.mock("./services/LabelDefinitions", () => ({
  invalidateLabelCache: vi.fn(),
}));

// Mock components
vi.mock("./components/PlatformSettings", () => ({
  GeneralSettings: () => (
    <div data-testid="general-settings">General Settings</div>
  ),
  PlatformSpecificSettings: ({ platform }: { platform: string }) => (
    <div data-testid={`platform-settings-${platform}`}>{platform} Settings</div>
  ),
  DebugSettings: () => <div data-testid="debug-settings">Debug Settings</div>,
}));

vi.mock("./components/HistorySection", () => ({
  HistorySection: () => (
    <div data-testid="history-section">History Section</div>
  ),
}));

vi.mock("./components/VersionInfo", () => ({
  VersionInfo: () => <div data-testid="version-info">Version Info</div>,
}));

vi.mock("./components/ThemeSettings", () => ({
  default: () => <div data-testid="theme-settings">Theme Settings</div>,
}));

vi.mock("./components/ModelSelector", () => ({
  ModelSelector: () => <div data-testid="model-selector">Model Selector</div>,
}));

// Mock assets
vi.mock("./assets/icon.png", () => ({
  default: "icon.png",
}));

// Mock locales
vi.mock("./locales/zh-CN", () => ({
  zhCNChangelog: "# DeepProfile 当前版本更新日志\n\n## 当前版本: v0.6.2 (Beta)",
  zhCNVersionHistory:
    "# DeepProfile 版本历史\n\n### v0.6.1 (2024-01-09) - 实时保存设置\n\n### v0.6.0 (2024-01-08) - Reddit 平台多语言支持增强\n\n### v0.5.1 (2024-01-10) - 多语言支持\n\n### v0.5.0 (2024-01-09) - 评论区舆情总结\n\n### v0.4.2 (2024-01-08) - 导出增强与体验优化\n\n### v0.4.1 (2024-01-07) - 性能优化\n\n### v0.4.0 (2024-01-06) - 历史记录与智能分类\n\n### v0.3.0 (2024-01-04) - 精准聚焦与体验优化\n\n### v0.2.0 (2024-01-03) - 深度分析与上下文感知\n\n### v0.1.0 (2024-01-02) - MVP 发布",
}));
vi.mock("./locales/en-US", () => ({
  enUSChangelog:
    "# DeepProfile Current Version Changelog\n\n## Current Version: v0.6.2 (Beta)",
  enUSVersionHistory:
    "# DeepProfile Version History\n\n### v0.6.1 (2024-01-09) - Real-time Settings Save\n\n### v0.6.0 (2024-01-08) - Reddit Platform Multilingual Support Enhancement\n\n### v0.5.1 (2024-01-10) - Multi-language Support\n\n### v0.5.0 (2024-01-09) - Comment Sentiment Summary\n\n### v0.4.2 (2024-01-08) - Enhanced Export and UX Optimization\n\n### v0.4.1 (2024-01-07) - Performance Optimization\n\n### v0.4.0 (2024-01-06) - History Records and Intelligent Classification\n\n### v0.3.0 (2024-01-04) - Precise Focus and UX Optimization\n\n### v0.2.0 (2024-01-03) - Deep Analysis and Context Awareness\n\n### v0.1.0 (2024-01-02) - MVP Release",
}));

describe("Options Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ConfigService.getConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(HistoryService.getAllUserRecords).mockResolvedValue([]);
  });

  it("renders options page with default general settings", async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText("DeepProfile")).toBeInTheDocument();
      expect(screen.getByTestId("general-settings")).toBeInTheDocument();
    });
  });

  it("switches tabs correctly", async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText("settings_zhihu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("settings_zhihu"));
    expect(screen.getByTestId("platform-settings-zhihu")).toBeInTheDocument();

    fireEvent.click(screen.getByText("settings_reddit"));
    expect(screen.getByTestId("platform-settings-reddit")).toBeInTheDocument();

    fireEvent.click(screen.getByText("settings_history"));
    expect(screen.getByTestId("history-section")).toBeInTheDocument();

    fireEvent.click(screen.getByText("settings_debug"));
    expect(screen.getByTestId("debug-settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("version_info"));
    expect(screen.getByTestId("version-info")).toBeInTheDocument();
  });

  it("loads history when history tab is active", async () => {
    render(<Options />);

    await waitFor(() => {
      expect(screen.getByText("settings_history")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("settings_history"));

    await waitFor(() => {
      expect(HistoryService.getAllUserRecords).toHaveBeenCalled();
    });
  });
});

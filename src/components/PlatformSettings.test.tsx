import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  GeneralSettings,
  PlatformSpecificSettings,
  DebugSettings,
  PROVIDERS,
  LANGUAGES,
} from "./PlatformSettings";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock I18nService
vi.mock("~services/I18nService", () => ({
  I18nService: {
    t: (key: string) => {
      const map: Record<string, string> = {
        settings_general: "通用设置",
        plugin_enabled: "插件已启用",
        plugin_disabled: "插件已禁用",
        plugin_enabled_desc: "插件已启用描述",
        plugin_disabled_desc: "插件已禁用描述",
        ai_provider: "AI 服务商",
        api_key: "API Key",
        api_base_url: "API Base URL",
        model_select: "模型选择",
        test_connection: "测试连接",
        connection_success: "连接成功",
        connection_failed: "连接失败",
        settings_zhihu: "知乎设置",
        settings_reddit: "Reddit设置",
        analysis_mode: "分析模式",
        mode_fast: "快速",
        mode_balanced: "平衡",
        mode_deep: "深度",
        mode_fast_desc: "快速模式描述",
        mode_balanced_desc: "平衡模式描述",
        mode_deep_desc: "深度模式描述",
        analyze_limit: "分析限制",
        settings_debug: "调试设置",
        debug_mode: "调试模式",
        debug_mode_desc: "调试模式描述",
      };
      return map[key] || key;
    },
    setLanguage: vi.fn(),
  },
}));

// Mock UIComponents
vi.mock("./UIComponents", () => ({
  Card: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="card">
      <h2>{title}</h2>
      {children}
    </div>
  ),
  InputGroup: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="input-group">
      <label>{label}</label>
      {children}
    </div>
  ),
}));

// Mock AppConfig type
type MockAppConfig = {
  globalEnabled: boolean;
  language: string;
  selectedProvider: string;
  apiKeys: Record<string, string>;
  customBaseUrls: Record<string, string>;
  customModelNames?: Record<string, string>;
  platformAnalysisModes?: {
    zhihu?: string;
    reddit?: string;
  };
  analyzeLimit?: number;
  enableDebug?: boolean;
};

describe("PlatformSettings", () => {
  const mockConfig: MockAppConfig = {
    globalEnabled: true,
    language: "zh-CN",
    selectedProvider: "openai",
    apiKeys: { openai: "test-key" },
    customBaseUrls: { openai: "https://api.openai.com" },
    platformAnalysisModes: { zhihu: "balanced", reddit: "fast" },
    analyzeLimit: 15,
  };

  const mockSetConfig = vi.fn();
  const mockHandleTestConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GeneralSettings", () => {
    it("renders general settings form", () => {
      render(
        <GeneralSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          isTesting={false}
          testResult={null}
          handleTestConnection={mockHandleTestConnection}
          renderModelSelector={() => <div>Model Selector</div>}
        />,
      );

      expect(screen.getByText("通用设置")).toBeInTheDocument();
      expect(screen.getByText("插件已启用")).toBeInTheDocument();
      expect(screen.getByLabelText("插件已启用")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("请输入 API Key")).toBeInTheDocument();
    });

    it("triggers test connection handler", () => {
      render(
        <GeneralSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          isTesting={false}
          testResult={null}
          handleTestConnection={mockHandleTestConnection}
          renderModelSelector={() => <div>Model Selector</div>}
        />,
      );

      fireEvent.click(screen.getByText("测试连接"));
      expect(mockHandleTestConnection).toHaveBeenCalledTimes(1);
    });
  });

  describe("PlatformSpecificSettings", () => {
    it("renders Zhihu settings", () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="zhihu"
        />,
      );

      expect(screen.getByText("知乎设置")).toBeInTheDocument();
      expect(screen.getByText("平衡")).toBeInTheDocument();
    });

    it("renders Reddit settings", () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="reddit"
        />,
      );

      expect(screen.getByText("Reddit设置")).toBeInTheDocument();
      expect(screen.getByText("快速")).toBeInTheDocument();
    });

    it("updates analysis mode when button clicked", () => {
      render(
        <PlatformSpecificSettings
          config={mockConfig}
          setConfig={mockSetConfig}
          platform="zhihu"
        />,
      );

      fireEvent.click(screen.getByText("深度"));
      expect(mockSetConfig).toHaveBeenCalledWith({
        ...mockConfig,
        platformAnalysisModes: {
          ...mockConfig.platformAnalysisModes,
          zhihu: "deep",
        },
      });
    });
  });

  describe("DebugSettings", () => {
    it("renders debug settings", () => {
      render(<DebugSettings config={mockConfig} setConfig={mockSetConfig} />);

      expect(screen.getByText("调试设置")).toBeInTheDocument();
      expect(screen.getByLabelText("调试模式")).toBeInTheDocument();
    });

    it("handles debug toggle", () => {
      render(<DebugSettings config={mockConfig} setConfig={mockSetConfig} />);

      const checkbox = screen.getByLabelText("调试模式");
      fireEvent.click(checkbox);
      expect(mockSetConfig).toHaveBeenCalledWith({
        ...mockConfig,
        enableDebug: true,
      });
    });
  });

  describe("Constants", () => {
    it("PROVIDERS array has correct structure", () => {
      expect(PROVIDERS).toBeInstanceOf(Array);
      expect(PROVIDERS[0]).toHaveProperty("value");
      expect(PROVIDERS[0]).toHaveProperty("label");
    });

    it("LANGUAGES array has correct structure", () => {
      expect(LANGUAGES).toBeInstanceOf(Array);
      expect(LANGUAGES[0]).toHaveProperty("value");
      expect(LANGUAGES[0]).toHaveProperty("label");
    });
  });
});

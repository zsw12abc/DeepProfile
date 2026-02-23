import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ThemeSettings from "./ThemeSettings";
import {
  ZHIHU_WHITE_THEME,
  type ExtendedAppConfig,
  type ThemeConfig,
} from "../types";
import { vi, describe, it, expect, beforeEach } from "vitest";

const tMap: Record<string, string> = {
  theme_settings: "主题设置",
  select_theme: "选择主题",
  create_custom_theme: "创建自定义主题",
  theme_id: "主题ID",
  theme_name: "主题名称",
  theme_description: "主题描述",
  unique_theme_identifier: "唯一主题标识",
  display_name_for_theme: "主题显示名称",
  optional_description: "可选描述",
  create_theme: "创建主题",
  edit: "编辑",
  delete: "删除",
  cancel: "取消",
  save_changes: "保存修改",
  edit_theme: "编辑主题",
  color_settings: "颜色设置",
  theme_applied: "主题已应用",
  failed_load_themes: "加载主题失败",
  failed_apply_theme: "应用主题失败",
  theme_id_name_required: "主题ID和名称必填",
  theme_created: "主题创建成功",
  failed_create_theme: "创建主题失败",
  confirm_delete_theme: "确认删除主题？",
  theme_deleted: "主题删除成功",
  failed_delete_theme: "删除主题失败",
  theme_updated: "主题更新成功",
  failed_save_theme: "保存主题失败",
  cannot_delete_builtin_theme: "不能删除内置主题",
  theme_zhihu_white_name: "知乎浅色",
  theme_zhihu_white_desc: "知乎白色主题",
};

const mockGetAllThemes = vi.fn();
const mockGetCurrentTheme = vi.fn();
const mockApplyTheme = vi.fn();
const mockAddTheme = vi.fn();
const mockDeleteTheme = vi.fn();

vi.mock("../services/I18nService", () => ({
  I18nService: {
    t: (key: string) => tMap[key] || key,
  },
}));

vi.mock("../services/ThemeService", () => ({
  ThemeService: {
    getInstance: () => ({
      getAllThemes: mockGetAllThemes,
      getCurrentTheme: mockGetCurrentTheme,
      applyTheme: mockApplyTheme,
      addTheme: mockAddTheme,
      deleteTheme: mockDeleteTheme,
    }),
  },
}));

describe("ThemeSettings", () => {
  const customTheme: ThemeConfig = {
    ...ZHIHU_WHITE_THEME,
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Custom ocean theme",
    colors: {
      ...ZHIHU_WHITE_THEME.colors,
      primary: "#005f99",
      secondary: "#00a3e0",
    },
  };

  const makeConfig = (themeId = "zhihu-white"): ExtendedAppConfig =>
    ({
      configVersion: 8,
      globalEnabled: true,
      language: "zh-CN",
      selectedProvider: "openai",
      apiKeys: {},
      customBaseUrls: {},
      customModelNames: {},
      analyzeLimit: 15,
      enableDebug: false,
      redactSensitiveMode: "sensitive-providers",
      observability: {
        errorMonitoringEnabled: false,
        analyticsEnabled: false,
        performanceMonitoringEnabled: false,
        complianceMonitoringEnabled: false,
        allowInProd: false,
        prodConsent: false,
        endpoint: "",
        sampleRate: 1,
        maxQueueSize: 100,
      },
      analysisMode: "balanced",
      platformAnalysisModes: {
        zhihu: "balanced",
        reddit: "balanced",
        twitter: "balanced",
        quora: "balanced",
        weibo: "balanced",
      },
      enabledPlatforms: {
        zhihu: true,
        reddit: true,
        twitter: false,
        quora: false,
        weibo: false,
      },
      platformConfigs: {
        zhihu: { enabled: true, baseUrl: "https://www.zhihu.com" },
        reddit: { enabled: true, baseUrl: "https://www.reddit.com" },
        twitter: { enabled: false, baseUrl: "https://twitter.com" },
        quora: { enabled: false, baseUrl: "https://www.quora.com" },
        weibo: { enabled: false, baseUrl: "https://weibo.com" },
      },
      themeId,
      themes: {
        "zhihu-white": ZHIHU_WHITE_THEME,
        "ocean-blue": customTheme,
      },
    }) as ExtendedAppConfig;

  const mockSetConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    mockGetAllThemes.mockResolvedValue([ZHIHU_WHITE_THEME, customTheme]);
    mockGetCurrentTheme.mockReturnValue(ZHIHU_WHITE_THEME);
    mockApplyTheme.mockResolvedValue(undefined);
    mockAddTheme.mockResolvedValue(undefined);
    mockDeleteTheme.mockResolvedValue(undefined);
  });

  it("loads and renders themes", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    expect(await screen.findByText(/主题设置/)).toBeInTheDocument();
    expect(await screen.findByText("知乎浅色")).toBeInTheDocument();
    expect(screen.getByText("Ocean Blue")).toBeInTheDocument();
    expect(mockGetAllThemes).toHaveBeenCalledTimes(1);
  });

  it("shows error message when loading themes fails", async () => {
    mockGetAllThemes.mockRejectedValueOnce(new Error("load failed"));
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    expect(await screen.findByText("加载主题失败")).toBeInTheDocument();
  });

  it("applies selected theme and updates config", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    const customThemeName = await screen.findByText("Ocean Blue");
    fireEvent.click(customThemeName);

    await waitFor(() => {
      expect(mockApplyTheme).toHaveBeenCalledWith("ocean-blue");
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: "ocean-blue" }),
      );
      expect(screen.getByText("主题已应用")).toBeInTheDocument();
    });
  });

  it("shows error when apply theme fails", async () => {
    mockApplyTheme.mockRejectedValueOnce(new Error("apply failed"));
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    fireEvent.click(await screen.findByText("Ocean Blue"));

    expect(await screen.findByText("应用主题失败")).toBeInTheDocument();
  });

  it("validates required fields before creating custom theme", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    fireEvent.click(screen.getByText("创建主题"));

    expect(await screen.findByText("主题ID和名称必填")).toBeInTheDocument();
    expect(mockAddTheme).not.toHaveBeenCalled();
  });

  it("creates custom theme and resets form", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    const idInput = screen.getByPlaceholderText("唯一主题标识");
    const nameInput = screen.getByPlaceholderText("主题显示名称");
    const descInput = screen.getByPlaceholderText("可选描述");

    fireEvent.change(idInput, { target: { value: "custom-id" } });
    fireEvent.change(nameInput, { target: { value: "Custom Name" } });
    fireEvent.change(descInput, { target: { value: "Custom Description" } });

    fireEvent.click(screen.getByText("创建主题"));

    await waitFor(() => {
      expect(mockGetCurrentTheme).toHaveBeenCalled();
      expect(mockAddTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "custom-id",
          name: "Custom Name",
          description: "Custom Description",
        }),
      );
      expect(screen.getByText("主题创建成功")).toBeInTheDocument();
    });

    expect(idInput).toHaveValue("");
    expect(nameInput).toHaveValue("");
    expect(descInput).toHaveValue("");
    expect(mockGetAllThemes).toHaveBeenCalledTimes(2);
  });

  it("uses default description when creating custom theme without description", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    fireEvent.change(screen.getByPlaceholderText("唯一主题标识"), {
      target: { value: "custom-no-desc" },
    });
    fireEvent.change(screen.getByPlaceholderText("主题显示名称"), {
      target: { value: "No Desc Theme" },
    });

    fireEvent.click(screen.getByText("创建主题"));

    await waitFor(() => {
      expect(mockAddTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "custom-no-desc",
          name: "No Desc Theme",
          description: "Custom theme: No Desc Theme",
        }),
      );
    });
  });

  it("shows error when creating custom theme fails", async () => {
    mockAddTheme.mockRejectedValueOnce(new Error("create failed"));
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    fireEvent.change(screen.getByPlaceholderText("唯一主题标识"), {
      target: { value: "custom-id" },
    });
    fireEvent.change(screen.getByPlaceholderText("主题显示名称"), {
      target: { value: "Custom Name" },
    });

    fireEvent.click(screen.getByText("创建主题"));

    expect(await screen.findByText("创建主题失败")).toBeInTheDocument();
  });

  it("deletes custom theme after confirmation", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("删除"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("确认删除主题？");
      expect(mockDeleteTheme).toHaveBeenCalledWith("ocean-blue");
      expect(screen.getByText("主题删除成功")).toBeInTheDocument();
    });
  });

  it("does not delete custom theme when confirmation is canceled", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("删除"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("确认删除主题？");
    });
    expect(mockDeleteTheme).not.toHaveBeenCalled();
  });

  it("falls back to default theme when deleting selected custom theme", async () => {
    render(
      <ThemeSettings
        config={makeConfig("ocean-blue")}
        setConfig={mockSetConfig}
      />,
    );

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("删除"));

    await waitFor(() => {
      expect(mockDeleteTheme).toHaveBeenCalledWith("ocean-blue");
      expect(mockApplyTheme).toHaveBeenCalledWith("zhihu-white");
      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: "zhihu-white" }),
      );
    });
  });

  it("shows error when deleting custom theme fails", async () => {
    mockDeleteTheme.mockRejectedValueOnce(new Error("delete failed"));
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("删除"));

    expect(await screen.findByText("删除主题失败")).toBeInTheDocument();
  });

  it("edits and saves custom theme", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("编辑"));

    const modal = screen.getByText(/编辑主题/).closest("div");
    expect(modal).toBeTruthy();

    const modalNameInput = screen.getByDisplayValue("Ocean Blue");
    fireEvent.change(modalNameInput, { target: { value: "Ocean Blue Pro" } });

    fireEvent.click(screen.getByText("保存修改"));

    await waitFor(() => {
      expect(mockAddTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ocean-blue",
          name: "Ocean Blue Pro",
        }),
      );
      expect(screen.getByText("主题更新成功")).toBeInTheDocument();
    });
  });

  it("shows error when saving edited theme fails", async () => {
    mockAddTheme.mockRejectedValueOnce(new Error("save failed"));
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("编辑"));
    fireEvent.click(screen.getByText("保存修改"));

    expect(await screen.findByText("保存主题失败")).toBeInTheDocument();
  });

  it("closes edit modal on cancel", async () => {
    render(<ThemeSettings config={makeConfig()} setConfig={mockSetConfig} />);

    await screen.findByText("Ocean Blue");
    fireEvent.click(screen.getByText("编辑"));

    expect(screen.getByText(/编辑主题/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("取消"));

    await waitFor(() => {
      expect(screen.queryByText(/编辑主题/)).not.toBeInTheDocument();
    });
  });

  it("syncs selected theme indicator when config.themeId changes", async () => {
    const { rerender } = render(
      <ThemeSettings
        config={makeConfig("zhihu-white")}
        setConfig={mockSetConfig}
      />,
    );

    await screen.findByText("知乎浅色");
    const zhihuCard = screen.getByText("知乎浅色").closest("div");
    expect(zhihuCard).toBeTruthy();
    expect(
      within(zhihuCard as HTMLElement).queryByText("✓"),
    ).toBeInTheDocument();

    rerender(
      <ThemeSettings
        config={makeConfig("ocean-blue")}
        setConfig={mockSetConfig}
      />,
    );

    await screen.findByText("Ocean Blue");
    const oceanCard = screen.getByText("Ocean Blue").closest("div");
    expect(oceanCard).toBeTruthy();
    expect(
      within(oceanCard as HTMLElement).queryByText("✓"),
    ).toBeInTheDocument();
  });
});

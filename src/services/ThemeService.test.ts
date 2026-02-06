import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeService } from "./ThemeService";
import { DEFAULT_CONFIG } from "../types";

// Mock chrome.storage.local - following the same pattern as ConfigService.test.ts
const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
};

global.chrome = {
  storage: {
    local: storageMock,
  },
} as any;

describe("ThemeService", () => {
  let themeService: ThemeService;

  beforeEach(() => {
    themeService = ThemeService.getInstance();
    vi.clearAllMocks();

    // Initialize with default config
    storageMock.get.mockResolvedValue({ deep_profile_config: DEFAULT_CONFIG });
  });

  it("should get the default theme initially", () => {
    const currentTheme = themeService.getCurrentTheme();
    expect(currentTheme.id).toBe("future-day");
  });

  it("should apply a new theme", async () => {
    const newTheme = {
      id: "test-theme",
      name: "Test Theme",
      description: "A test theme",
      colors: {
        primary: "#ff0000",
        secondary: "#00ff00",
        background: "#ffffff",
        surface: "#f5f5f5",
        text: "#000000",
        textSecondary: "#666666",
        border: "#cccccc",
        success: "#00ff00",
        warning: "#ffff00",
        error: "#ff0000",
        accent: "#ff00ff",
        successBg: "#e6fffa",
        successText: "#006644",
        successBorder: "#b3ffcc",
        errorBg: "#ffe6e6",
        errorText: "#cc0000",
        errorBorder: "#ffb3b3",
        primaryText: "#ffffff",
        warningText: "#000000",
      },
      typography: {
        fontFamily: "Arial, sans-serif",
        fontSizeBase: "14px",
        fontSizeSmall: "12px",
        fontSizeMedium: "16px",
        fontSizeLarge: "18px",
        fontWeightNormal: 400,
        fontWeightBold: 600,
        lineHeight: 1.5,
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      borderRadius: {
        small: "4px",
        medium: "8px",
        large: "12px",
      },
      shadows: {
        small: "0 2px 4px rgba(0,0,0,0.05)",
        medium: "0 4px 12px rgba(0,0,0,0.1)",
        large: "0 8px 24px rgba(0,0,0,0.15)",
      },
    };

    // Mock for getConfig in addTheme - return default config first
    storageMock.get.mockResolvedValueOnce({
      deep_profile_config: DEFAULT_CONFIG,
    });
    // Mock for set operation
    storageMock.set.mockResolvedValue(undefined);

    await themeService.addTheme(newTheme as any);

    // Verify that the set method was called
    expect(storageMock.set).toHaveBeenCalledTimes(1);
    const callArgs = storageMock.set.mock.calls[0][0];
    // Check if the key is correct (either 'deep_profile_config' or potentially undefined due to context issue)
    const configKey = Object.keys(callArgs)[0];
    expect(configKey).toBe("deep_profile_config"); // This is the line that was failing

    expect(callArgs[configKey].themes["test-theme"]).toBeDefined();
    expect(callArgs[configKey].themes["test-theme"].id).toBe("test-theme");

    // Mock for applyTheme - need to return config with the new theme
    storageMock.get
      .mockResolvedValueOnce({
        deep_profile_config: {
          ...DEFAULT_CONFIG,
          themes: { ...DEFAULT_CONFIG.themes, "test-theme": newTheme },
        },
      }) // getConfig in applyTheme
      .mockResolvedValueOnce({
        deep_profile_config: {
          ...DEFAULT_CONFIG,
          themes: { ...DEFAULT_CONFIG.themes, "test-theme": newTheme },
          themeId: "test-theme",
        },
      }); // getConfig after update in applyTheme

    await themeService.applyTheme("test-theme");

    const currentTheme = themeService.getCurrentTheme();
    expect(currentTheme.id).toBe("test-theme");
    expect(currentTheme.colors.primary).toBe("#ff0000");
  });

  it("should get all themes", async () => {
    storageMock.get.mockResolvedValue({ deep_profile_config: DEFAULT_CONFIG });
    const themes = await themeService.getAllThemes();
    expect(themes).toHaveLength(Object.keys(DEFAULT_CONFIG.themes).length);
    expect(themes.some((t) => t.id === "zhihu-white")).toBe(true);
  });

  it("should add a new theme", async () => {
    const newTheme = {
      id: "new-test-theme",
      name: "New Test Theme",
      description: "A new test theme",
      colors: {
        primary: "#123456",
        secondary: "#654321",
        background: "#ffffff",
        surface: "#f5f5f5",
        text: "#000000",
        textSecondary: "#666666",
        border: "#cccccc",
        success: "#00ff00",
        warning: "#ffff00",
        error: "#ff0000",
        accent: "#ff00ff",
        successBg: "#e6fffa",
        successText: "#006644",
        successBorder: "#b3ffcc",
        errorBg: "#ffe6e6",
        errorText: "#cc0000",
        errorBorder: "#ffb3b3",
        primaryText: "#ffffff",
        warningText: "#000000",
      },
      typography: {
        fontFamily: "Arial, sans-serif",
        fontSizeBase: "14px",
        fontSizeSmall: "12px",
        fontSizeMedium: "16px",
        fontSizeLarge: "18px",
        fontWeightNormal: 400,
        fontWeightBold: 600,
        lineHeight: 1.5,
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      borderRadius: {
        small: "4px",
        medium: "8px",
        large: "12px",
      },
      shadows: {
        small: "0 2px 4px rgba(0,0,0,0.05)",
        medium: "0 4px 12px rgba(0,0,0,0.1)",
        large: "0 8px 24px rgba(0,0,0,0.15)",
      },
    };

    // Mock for getConfig in addTheme
    storageMock.get.mockResolvedValue({ deep_profile_config: DEFAULT_CONFIG });
    storageMock.set.mockResolvedValue(undefined);

    await themeService.addTheme(newTheme as any);

    // Check that the set method was called and the new theme was added
    expect(storageMock.set).toHaveBeenCalledTimes(1);
    const callArgs = storageMock.set.mock.calls[0][0];
    const configKey = Object.keys(callArgs)[0];
    expect(configKey).toBe("deep_profile_config");

    const configWithNewTheme = callArgs[configKey];
    expect(configWithNewTheme.themes["new-test-theme"]).toBeDefined();
    expect(configWithNewTheme.themes["new-test-theme"].id).toBe(
      "new-test-theme",
    );
  });

  it("should not allow deleting built-in themes", async () => {
    await expect(themeService.deleteTheme("zhihu-white")).rejects.toThrow(
      "Cannot delete built-in themes",
    );
  });

  it("should initialize with the configured theme", async () => {
    // Setup: Save a config with a non-default theme
    const customConfig = {
      ...DEFAULT_CONFIG,
      themeId: "zhihu-black",
    };
    storageMock.get.mockResolvedValue({ deep_profile_config: customConfig });

    await themeService.initialize();
    const currentTheme = themeService.getCurrentTheme();

    expect(currentTheme.id).toBe("zhihu-black");
  });
});

import React, { useState, useEffect } from "react";
import { I18nService } from "../services/I18nService";
import { ThemeService } from "../services/ThemeService";
import type { ThemeConfig, ExtendedAppConfig } from "../types";

const BUILTIN_THEME_IDS = [
  "future-day",
  "future-night",
  "zhihu-white",
  "zhihu-black",
  "reddit-white",
  "reddit-black",
];

// 获取国际化主题名称和描述
const getLocalizedThemeInfo = (themeId: string) => {
  switch (themeId) {
    case "zhihu-white":
      return {
        name: I18nService.t("theme_zhihu_white_name"),
        description: I18nService.t("theme_zhihu_white_desc"),
      };
    case "zhihu-black":
      return {
        name: I18nService.t("theme_zhihu_black_name"),
        description: I18nService.t("theme_zhihu_black_desc"),
      };
    case "reddit-white":
      return {
        name: I18nService.t("theme_reddit_white_name"),
        description: I18nService.t("theme_reddit_white_desc"),
      };
    case "reddit-black":
      return {
        name: I18nService.t("theme_reddit_black_name"),
        description: I18nService.t("theme_reddit_black_desc"),
      };
    case "future-day":
      return {
        name: I18nService.t("theme_future_day_name"),
        description: I18nService.t("theme_future_day_desc"),
      };
    case "future-night":
      return {
        name: I18nService.t("theme_future_night_name"),
        description: I18nService.t("theme_future_night_desc"),
      };
    default:
      return null;
  }
};

interface ThemeSettingsProps {
  config: ExtendedAppConfig;
  setConfig: (config: ExtendedAppConfig) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ config, setConfig }) => {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    config.themeId,
  );
  const [customTheme, setCustomTheme] = useState<Partial<ThemeConfig>>({
    id: "",
    name: "",
    description: "",
  });
  const [editingTheme, setEditingTheme] = useState<ThemeConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    setSelectedThemeId(config.themeId);
  }, [config.themeId]);

  const loadThemes = async () => {
    try {
      const allThemes = await ThemeService.getInstance().getAllThemes();
      setThemes(allThemes);
    } catch (error) {
      console.error("Failed to load themes:", error);
      setStatus({
        type: "error",
        message: I18nService.t("failed_load_themes"),
      });
    }
  };

  const handleThemeChange = async (themeId: string) => {
    try {
      await ThemeService.getInstance().applyTheme(themeId);
      setSelectedThemeId(themeId);

      // 更新父组件的配置
      const updatedConfig = { ...config, themeId };
      setConfig(updatedConfig);

      setStatus({ type: "success", message: I18nService.t("theme_applied") });
    } catch (error) {
      console.error("Failed to apply theme:", error);
      setStatus({
        type: "error",
        message: I18nService.t("failed_apply_theme"),
      });
    }
  };

  const handleCreateCustomTheme = async () => {
    if (!customTheme.id || !customTheme.name) {
      setStatus({
        type: "error",
        message: I18nService.t("theme_id_name_required"),
      });
      return;
    }

    try {
      // 使用当前主题作为基础进行自定义
      const currentTheme = await ThemeService.getInstance().getCurrentTheme();
      const newTheme: ThemeConfig = {
        ...currentTheme,
        id: customTheme.id,
        name: customTheme.name,
        description:
          customTheme.description || `Custom theme: ${customTheme.name}`,
      };

      await ThemeService.getInstance().addTheme(newTheme);
      setCustomTheme({ id: "", name: "", description: "" });
      await loadThemes();
      setStatus({ type: "success", message: I18nService.t("theme_created") });
    } catch (error) {
      console.error("Failed to create theme:", error);
      setStatus({
        type: "error",
        message: I18nService.t("failed_create_theme"),
      });
    }
  };

  const handleEditTheme = (theme: ThemeConfig) => {
    if (BUILTIN_THEME_IDS.includes(theme.id)) {
      // 为内置主题创建副本进行编辑
      const localizedInfo = getLocalizedThemeInfo(theme.id);
      const newThemeId = `${theme.id}_custom`;
      setEditingTheme({
        ...theme,
        id: newThemeId,
        name: localizedInfo
          ? `${localizedInfo.name} (Custom Copy)`
          : `${theme.name} (Custom Copy)`,
      });
      setIsEditing(true);
    } else {
      setEditingTheme(theme);
      setIsEditing(true);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (BUILTIN_THEME_IDS.includes(themeId)) {
      setStatus({
        type: "error",
        message: I18nService.t("cannot_delete_builtin_theme"),
      });
      return;
    }

    if (window.confirm(I18nService.t("confirm_delete_theme"))) {
      try {
        await ThemeService.getInstance().deleteTheme(themeId);
        if (selectedThemeId === themeId) {
          await handleThemeChange("zhihu-white");
        }
        await loadThemes();
        setStatus({ type: "success", message: I18nService.t("theme_deleted") });
      } catch (error) {
        console.error("Failed to delete theme:", error);
        setStatus({
          type: "error",
          message: I18nService.t("failed_delete_theme"),
        });
      }
    }
  };

  const handleSaveEditedTheme = async () => {
    if (!editingTheme) return;

    try {
      await ThemeService.getInstance().addTheme(editingTheme);
      setIsEditing(false);
      setEditingTheme(null);
      await loadThemes();
      setStatus({ type: "success", message: I18nService.t("theme_updated") });
    } catch (error) {
      console.error("Failed to save theme:", error);
      setStatus({ type: "error", message: I18nService.t("failed_save_theme") });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTheme(null);
  };

  const handleThemeFieldChange = (field: keyof ThemeConfig, value: any) => {
    if (editingTheme) {
      setEditingTheme({
        ...editingTheme,
        [field]: value,
      });
    }
  };

  const handleColorFieldChange = (
    field: keyof ThemeConfig["colors"],
    value: string,
  ) => {
    if (editingTheme) {
      setEditingTheme({
        ...editingTheme,
        colors: {
          ...editingTheme.colors,
          [field]: value,
        },
      });
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "var(--theme-surface, #fff)",
        borderRadius: "var(--theme-border-radius-medium, 10px)",
        marginBottom: "24px",
        border: "1px solid var(--theme-border, #eee)",
      }}
    >
      <h3
        style={{
          margin: "0 0 20px 0",
          fontSize: "18px",
          fontWeight: "600",
          color: "var(--theme-text, #333)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        🎨 {I18nService.t("theme_settings")}
      </h3>

      {status && (
        <div
          style={{
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            backgroundColor:
              status.type === "success"
                ? "var(--theme-success-bg, #d4edda)"
                : "var(--theme-error-bg, #f8d7da)",
            color:
              status.type === "success"
                ? "var(--theme-success-text, #155724)"
                : "var(--theme-error-text, #721c24)",
            border: `1px solid ${
              status.type === "success"
                ? "var(--theme-success-border, #c3e6cb)"
                : "var(--theme-error-border, #f5c6cb)"
            }`,
          }}
        >
          {status.message}
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "500",
            color: "var(--theme-text, #555)",
          }}
        >
          {I18nService.t("select_theme")}
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          {themes.map((theme) => {
            // 对内置主题使用国际化名称和描述
            const localizedInfo = getLocalizedThemeInfo(theme.id);
            const displayName = localizedInfo ? localizedInfo.name : theme.name;
            const displayDescription = localizedInfo
              ? localizedInfo.description
              : theme.description;

            return (
              <div
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                style={{
                  padding: "16px",
                  border:
                    selectedThemeId === theme.id
                      ? `2px solid ${theme.colors.primary}`
                      : `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.medium,
                  cursor: "pointer",
                  backgroundColor: theme.colors.surface,
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <strong
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSizeMedium,
                    }}
                  >
                    {displayName}
                  </strong>
                  {selectedThemeId === theme.id && (
                    <span
                      style={{ color: theme.colors.primary, fontSize: "16px" }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: theme.typography.fontSizeSmall,
                    color: theme.colors.textSecondary,
                    marginBottom: "12px",
                  }}
                >
                  {displayDescription}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: theme.colors.primary,
                      borderRadius: "4px",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: theme.colors.secondary,
                      borderRadius: "4px",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: theme.colors.success,
                      borderRadius: "4px",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: theme.colors.warning,
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                  {!BUILTIN_THEME_IDS.includes(theme.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTheme(theme);
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: theme.colors.primary,
                        color: "white",
                        border: "none",
                        borderRadius: theme.borderRadius.small,
                        fontSize: theme.typography.fontSizeSmall,
                        cursor: "pointer",
                      }}
                    >
                      {I18nService.t("edit")}
                    </button>
                  )}
                  {!BUILTIN_THEME_IDS.includes(theme.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTheme(theme.id);
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: theme.colors.error,
                        color: "white",
                        border: "none",
                        borderRadius: theme.borderRadius.small,
                        fontSize: theme.typography.fontSizeSmall,
                        cursor: "pointer",
                      }}
                    >
                      {I18nService.t("delete")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 自定义主题创建 */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "var(--theme-surface, #f8f9fa)",
          borderRadius: "var(--theme-border-radius-medium, 8px)",
          marginBottom: "24px",
        }}
      >
        <h4
          style={{
            margin: "0 0 16px 0",
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--theme-text, #333)",
          }}
        >
          {I18nService.t("create_custom_theme")}
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                color: "var(--theme-text, #555)",
              }}
            >
              {I18nService.t("theme_id")}
            </label>
            <input
              type="text"
              value={customTheme.id}
              onChange={(e) =>
                setCustomTheme({ ...customTheme, id: e.target.value })
              }
              placeholder={I18nService.t("unique_theme_identifier")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--theme-border, #ddd)",
                borderRadius: "var(--theme-border-radius-small, 4px)",
                fontSize: "14px",
                backgroundColor: "var(--theme-surface, #fff)",
                color: "var(--theme-text, #000)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                color: "var(--theme-text, #555)",
              }}
            >
              {I18nService.t("theme_name")}
            </label>
            <input
              type="text"
              value={customTheme.name}
              onChange={(e) =>
                setCustomTheme({ ...customTheme, name: e.target.value })
              }
              placeholder={I18nService.t("display_name_for_theme")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--theme-border, #ddd)",
                borderRadius: "var(--theme-border-radius-small, 4px)",
                fontSize: "14px",
                backgroundColor: "var(--theme-surface, #fff)",
                color: "var(--theme-text, #000)",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontSize: "14px",
              color: "var(--theme-text, #555)",
            }}
          >
            {I18nService.t("theme_description")}
          </label>
          <textarea
            value={customTheme.description || ""}
            onChange={(e) =>
              setCustomTheme({ ...customTheme, description: e.target.value })
            }
            placeholder={I18nService.t("optional_description")}
            rows={2}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--theme-border, #ddd)",
              borderRadius: "var(--theme-border-radius-small, 4px)",
              fontSize: "14px",
              resize: "vertical",
              backgroundColor: "var(--theme-surface, #fff)",
              color: "var(--theme-text, #000)",
            }}
          />
        </div>

        <button
          onClick={handleCreateCustomTheme}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--theme-primary, #3498db)",
            color: "white",
            border: "none",
            borderRadius: "var(--theme-border-radius-medium, 6px)",
            fontSize: "15px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {I18nService.t("create_theme")}
        </button>
      </div>

      {/* 编辑主题模态框 */}
      {isEditing && editingTheme && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              backgroundColor: editingTheme.colors.surface,
              padding: "24px",
              borderRadius: editingTheme.borderRadius.large,
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: editingTheme.shadows.large,
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: editingTheme.colors.text,
              }}
            >
              {I18nService.t("edit_theme" as any)} - {editingTheme.name}
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  color: editingTheme.colors.textSecondary,
                }}
              >
                {I18nService.t("theme_id")}
              </label>
              <input
                type="text"
                value={editingTheme.id}
                onChange={(e) => handleThemeFieldChange("id", e.target.value)}
                disabled={BUILTIN_THEME_IDS.includes(editingTheme.id)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: `1px solid ${editingTheme.colors.border}`,
                  borderRadius: editingTheme.borderRadius.small,
                  fontSize: "14px",
                  backgroundColor: editingTheme.colors.surface,
                  color: editingTheme.colors.text,
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  color: editingTheme.colors.textSecondary,
                }}
              >
                {I18nService.t("theme_name")}
              </label>
              <input
                type="text"
                value={editingTheme.name}
                onChange={(e) => handleThemeFieldChange("name", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: `1px solid ${editingTheme.colors.border}`,
                  borderRadius: editingTheme.borderRadius.small,
                  fontSize: "14px",
                  backgroundColor: editingTheme.colors.surface,
                  color: editingTheme.colors.text,
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  color: editingTheme.colors.textSecondary,
                }}
              >
                {I18nService.t("theme_description")}
              </label>
              <textarea
                value={editingTheme.description}
                onChange={(e) =>
                  handleThemeFieldChange("description", e.target.value)
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: `1px solid ${editingTheme.colors.border}`,
                  borderRadius: editingTheme.borderRadius.small,
                  fontSize: "14px",
                  backgroundColor: editingTheme.colors.surface,
                  color: editingTheme.colors.text,
                  resize: "vertical",
                }}
              />
            </div>

            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                fontWeight: "600",
                color: editingTheme.colors.text,
              }}
            >
              {I18nService.t("color_settings")}
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {Object.entries(editingTheme.colors).map(
                ([colorName, colorValue]) => (
                  <div key={colorName}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "14px",
                        color: editingTheme.colors.textSecondary,
                      }}
                    >
                      {I18nService.t(`color_${colorName}` as any) ||
                        colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) =>
                          handleColorFieldChange(
                            colorName as keyof ThemeConfig["colors"],
                            e.target.value,
                          )
                        }
                        style={{
                          width: "50px",
                          height: "30px",
                          border: `1px solid ${editingTheme.colors.border}`,
                          borderRadius: editingTheme.borderRadius.small,
                          padding: 0,
                        }}
                      />
                      <input
                        type="text"
                        value={colorValue}
                        onChange={(e) =>
                          handleColorFieldChange(
                            colorName as keyof ThemeConfig["colors"],
                            e.target.value,
                          )
                        }
                        style={{
                          flex: 1,
                          padding: "4px 8px",
                          border: `1px solid ${editingTheme.colors.border}`,
                          borderRadius: editingTheme.borderRadius.small,
                          fontSize: "12px",
                          backgroundColor: editingTheme.colors.surface,
                          color: editingTheme.colors.text,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: "10px 20px",
                  backgroundColor: editingTheme.colors.surface,
                  color: editingTheme.colors.text,
                  border: `1px solid ${editingTheme.colors.border}`,
                  borderRadius: editingTheme.borderRadius.small,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                {I18nService.t("cancel")}
              </button>
              <button
                onClick={handleSaveEditedTheme}
                style={{
                  padding: "10px 20px",
                  backgroundColor: editingTheme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: editingTheme.borderRadius.small,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                {I18nService.t("save_changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSettings;

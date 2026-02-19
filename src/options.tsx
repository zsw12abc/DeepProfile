import React, { useEffect, useState, useCallback } from "react";
import { ConfigService } from "./services/ConfigService";
import { HistoryService } from "./services/HistoryService";
import { TopicService, type MacroCategory } from "./services/TopicService";
import { calculateFinalLabel } from "./services/LabelUtils";
import { ExportService } from "./services/ExportService";
import {
  DEFAULT_CONFIG,
  type AIProvider,
  type ExtendedAppConfig,
  type AnalysisMode,
  type SupportedPlatform,
  type UserHistoryRecord,
  type ProfileData,
  type Language,
} from "./types";
// 动态导入图标以支持测试环境
let icon: string;

try {
  // 尝试动态导入实际图标
  const actualIcon = require("../assets/icon.png");
  icon = typeof actualIcon === "string" ? actualIcon : actualIcon.default;
} catch (e) {
  // 在生产环境中，使用runtime获取图标路径
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.getURL
  ) {
    icon = chrome.runtime.getURL("assets/icon.png");
  } else {
    // 如果在测试环境中，chrome API 不可用，使用默认路径
    icon = "/assets/icon.png";
  }
}

// 导出最终图标
const finalIcon = icon;
import html2canvas from "html2canvas";
import { ZhihuClient } from "./services/ZhihuClient";
import { I18nService } from "./services/I18nService";
import MarkdownRenderer from "./components/MarkdownRenderer";
// 动态导入CHANGELOG文件以支持测试环境
import { zhCNChangelog, zhCNVersionHistory } from "./locales/zh-CN";
import { enUSChangelog, enUSVersionHistory } from "./locales/en-US";
import {
  GeneralSettings,
  PlatformSpecificSettings,
  DebugSettings,
} from "./components/PlatformSettings";
import { HistorySection } from "./components/HistorySection";
import { VersionInfo } from "./components/VersionInfo";
import {
  ZhihuIcon,
  RedditIcon,
  TwitterIcon,
  QuoraIcon,
  getBaseUrlPlaceholder,
  shouldShowBaseUrlInput,
} from "./components/HelperComponents";
import { ModelSelector } from "./components/ModelSelector";
import ThemeSettings from "./components/ThemeSettings";
import { ThemeService } from "./services/ThemeService";
import { LabelService } from "./services/LabelService";

// 获取版本信息
const getVersion = (): string => {
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.getManifest
  ) {
    try {
      const manifest = chrome.runtime.getManifest();
      return manifest.version;
    } catch (e) {
      return "1.0.0"; // Fallback
    }
  } else {
    return "1.0.0"; // Fallback
  }
};

// 新增函数：获取CHANGELOG内容
const fetchChangelogContent = async (
  lang: string,
): Promise<{ changelog: string; versionHistory: string }> => {
  if (lang === "zh-CN") {
    return { changelog: zhCNChangelog, versionHistory: zhCNVersionHistory };
  } else {
    return { changelog: enUSChangelog, versionHistory: enUSVersionHistory };
  }
};

type PlatformId =
  | "general"
  | "zhihu"
  | "reddit"
  | "twitter"
  | "quora"
  | "debug"
  | "history"
  | "version";

export default function Options() {
  const [config, setConfig] = useState<ExtendedAppConfig | null>(null);
  const [status, setStatus] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("general");

  const [historyRecords, setHistoryRecords] = useState<UserHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [versionHistory, setVersionHistory] = useState("");

  // Force re-render when language changes
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    // 初始化主题服务
    ThemeService.getInstance()
      .initialize()
      .then(() => {
        ConfigService.getConfig().then((c) => {
          setConfig({ ...DEFAULT_CONFIG, ...c });
          I18nService.setLanguage(c.language || "zh-CN");
          forceUpdate();
        });
      });
  }, []);

  useEffect(() => {
    const fetchChangelog = async () => {
      if (!config?.language) return;

      const lang = config.language;

      // 根据语言设置分别设置更新日志和版本历史
      if (lang === "zh-CN") {
        setChangelog(zhCNChangelog);
        setVersionHistory(zhCNVersionHistory);
      } else {
        setChangelog(enUSChangelog);
        setVersionHistory(enUSVersionHistory);
      }
    };

    if (config) {
      fetchChangelog();
    }
  }, [config?.language]);

  useEffect(() => {
    if (activePlatform === "history") {
      loadHistory();
    }
  }, [activePlatform]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const records = await HistoryService.getAllUserRecords();
      setHistoryRecords(records);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteProfile = async (
    userId: string,
    platform: SupportedPlatform,
    category: string,
  ) => {
    if (confirm(I18nService.t("confirm_delete"))) {
      await HistoryService.deleteProfile(userId, platform, category);
      await loadHistory(); // Reload list
    }
  };

  const handleDeleteUser = async (
    userId: string,
    platform: SupportedPlatform,
  ) => {
    if (confirm(I18nService.t("confirm_delete"))) {
      await HistoryService.deleteUserRecord(userId, platform);
      await loadHistory(); // Reload list
    }
  };

  const handleClearAllHistory = async () => {
    if (confirm(I18nService.t("confirm_clear_all"))) {
      await HistoryService.clearAll();
      await loadHistory(); // Reload list
    }
  };

  const handleExportMarkdown = (
    profileData: ProfileData,
    category: MacroCategory,
    userId: string,
    timestamp: number,
  ) => {
    const userHomeUrl = `https://www.zhihu.com/people/${userId}`;
    const nickname =
      profileData.nickname || `${I18nService.t("unknown_user")}${userId}`;
    const md = ExportService.toMarkdown(
      profileData,
      category,
      userHomeUrl,
      timestamp,
    );

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DeepProfile_${nickname}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async (
    profileData: ProfileData,
    category: MacroCategory,
    userId: string,
    timestamp: number,
    userInfo?: any,
  ) => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const nickname =
        userInfo?.name ||
        profileData.nickname ||
        `${I18nService.t("unknown_user")}${userId}`;
      const topicClassification =
        profileData.topic_classification ||
        I18nService.t("topic_classification");
      const summary = profileData.summary || "";
      const valueOrientation = (profileData.value_orientation || []).filter(
        (item) => Math.abs(item.score) > 1e-6,
      );
      const dateStr = new Date(timestamp).toLocaleDateString(
        config?.language === "en-US" ? "en-US" : "zh-CN",
      );

      // 创建一个临时的、样式化的容器用于截图
      const exportContainer = document.createElement("div");
      exportContainer.style.position = "absolute";
      exportContainer.style.top = "-9999px";
      exportContainer.style.left = "-9999px";
      exportContainer.style.width = "400px"; // 固定宽度
      exportContainer.style.backgroundColor = "#f0f2f5";
      exportContainer.style.padding = "20px";
      exportContainer.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      document.body.appendChild(exportContainer);

      // 渲染价值取向条
      let valueOrientationHtml = "";
      if (valueOrientation && valueOrientation.length > 0) {
        valueOrientationHtml = valueOrientation
          .map((item) => {
            const { label: labelName, score } = item;
            const { label, percentage } = calculateFinalLabel(labelName, score);

            // 确保分数在-1到1的范围内
            const normalizedScore = Math.max(-1, Math.min(1, score));

            // 计算百分比（取分数绝对值并转换为百分比）
            const absPercentage = Math.abs(normalizedScore) * 100;

            // 计算左侧和右侧的填充百分比
            const leftFillPercentage =
              normalizedScore < 0 ? Math.abs(normalizedScore) * 50 : 0;
            const rightFillPercentage =
              normalizedScore > 0 ? normalizedScore * 50 : 0;

            // 计算颜色强度 - 红色代表负值，蓝色代表正值
            const colorIntensity = Math.abs(normalizedScore) * 100;
            const leftColor =
              normalizedScore < 0
                ? `hsl(0, 70%, ${70 - colorIntensity * 0.3}%)`
                : "#f0f2f5"; // 红色代表负值
            const rightColor =
              normalizedScore > 0
                ? `hsl(210, 70%, ${70 - colorIntensity * 0.3}%)`
                : "#f0f2f5"; // 蓝色代表正值

            return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 4px 8px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; margin-bottom: 8px;">
                    <div style="width: 100%; text-align: center; margin-bottom: 4px; font-weight: 600; color: #333;">${Math.round(absPercentage)}%</div>
                    <div style="display: flex; align-items: center; width: 100%;">
                        <span style="flex: 0 0 auto; min-width: 80px; color: #333; text-align: right; margin-right: 8px;">${label.split(" vs ")[0] || "Left"}</span>
                        <div style="flex: 1; height: 12px; background-color: #e0e0e0; border-radius: 6px; overflow: hidden; position: relative;">
                            <div style="height: 100%; width: ${leftFillPercentage}%; background-color: ${leftColor}; position: absolute; right: 50%; transform: translateX(0);"></div>
                            <div style="position: absolute; left: 50%; top: 0; height: 100%; width: 2px; background-color: #333; transform: translateX(-1px); z-index: 1;"></div>
                            <div style="height: 100%; width: ${rightFillPercentage}%; background-color: ${rightColor}; position: absolute; left: 50%; transform: translateX(0);"></div>
                        </div>
                        <span style="flex: 0 0 auto; min-width: 80px; color: #333; text-align: left; margin-left: 8px;">${label.split(" vs ")[1] || "Right"}</span>
                    </div>
                </div>
              `;
          })
          .join("");
      }

      let avatarSrc = finalIcon;
      if (userInfo?.avatar_url) {
        const base64Avatar = await ZhihuClient.fetchImageAsBase64(
          userInfo.avatar_url,
        );
        if (base64Avatar) {
          avatarSrc = base64Avatar;
        }
      }

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent("https://chrome.google.com/webstore/detail/deepprofile")}`;

      exportContainer.innerHTML = `
        <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #0084ff 0%, #0055ff 100%); padding: 24px 20px; color: white; position: relative;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 60px; height: 60px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); overflow: hidden;">
                        <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">${nickname}</h2>
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">DeepProfile ${I18nService.t("app_description")}</div>
                    </div>
                </div>
                <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                    <div style="font-size: 10px; opacity: 0.8;">${I18nService.t("date_label")}</div>
                    <div style="font-size: 14px; font-weight: 600;">${dateStr}</div>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t("topic_classification")}</div>
                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; background-color: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${topicClassification}</div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t("ai_summary")}</div>
                    <div style="font-size: 14px; line-height: 1.6; color: #444; background-color: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 3px solid #0084ff;">
                        ${summary}
                    </div>
                </div>

                ${
                  valueOrientationHtml
                    ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t("value_orientation")}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${valueOrientationHtml}
                    </div>
                </div>
                `
                    : ""
                }
                
                <div style="border-top: 1px dashed #e0e0e0; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${qrCodeUrl}" style="width: 48px; height: 48px; border-radius: 4px;" crossOrigin="anonymous" />
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #1a1a1a;">DeepProfile</div>
                            <div style="font-size: 10px; color: #8590a6;">${I18nService.t("ai_profile_analysis")}</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #999; text-align: right;">
                        Scan to install<br/>Start your AI journey
                    </div>
                </div>
            </div>
      `;

      // 等待图片加载
      await new Promise((resolve) => setTimeout(resolve, 800));

      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `DeepProfile_Card_${nickname}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      document.body.removeChild(exportContainer);
    } catch (e) {
      console.error("Export image failed:", e);
      alert(I18nService.t("export_image_failed"));
    } finally {
      setIsExporting(false);
    }
  };

  const fetchModels = useCallback(
    async (provider: AIProvider, apiKey: string, baseUrl: string) => {
      if (!apiKey && provider !== "ollama") {
        setModels([]);
        return;
      }

      setIsLoadingModels(true);
      setModelError(null);

      try {
        const response = await chrome.runtime.sendMessage({
          type: "LIST_MODELS",
          provider,
          apiKey,
          baseUrl,
        });
        if (response.success) {
          setModels(response.data);
        } else {
          setModelError(response.error || "Failed to fetch models");
        }
      } catch (e: any) {
        setModelError(e.message);
      } finally {
        setIsLoadingModels(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (config) {
      const timer = setTimeout(() => {
        fetchModels(
          config.selectedProvider,
          config.apiKeys[config.selectedProvider] || "",
          config.customBaseUrls[config.selectedProvider] || "",
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    config?.selectedProvider,
    config?.apiKeys,
    config?.customBaseUrls,
    fetchModels,
  ]);

  // 自动保存配置的函数
  const autoSaveConfig = async (newConfig: any) => {
    if (!newConfig) return;

    // 检查语言是否已更改
    const oldConfig = await ConfigService.getConfig();
    const languageChanged = oldConfig.language !== newConfig.language;

    // 保存配置
    await ConfigService.saveConfig(newConfig);

    // 如果语言已更改，更新国际化服务
    if (languageChanged) {
      I18nService.setLanguage(newConfig.language);

      // 如果语言已更改，刷新标签缓存以更新新语言的标签
      const labelService = LabelService.getInstance();
      labelService.refreshCategories();

      // 同样使标签缓存无效
      const { invalidateLabelCache } = await import(
        "./services/LabelDefinitions"
      );
      invalidateLabelCache();

      forceUpdate();
    }
  };

  // 处理配置更改的函数
  const handleConfigChange = async (newConfig: any) => {
    setConfig(newConfig);
    await autoSaveConfig(newConfig);

    // 显示短暂的保存状态
    setStatus(I18nService.t("saved"));
    setTimeout(() => setStatus(""), 1500);
  };

  const handleTestConnection = async () => {
    if (!config) return;
    setIsTesting(true);
    setTestResult(null);

    const provider = config.selectedProvider;
    const apiKey = config.apiKeys[provider] || "";
    const baseUrl = config.customBaseUrls[provider] || "";
    const model = config.customModelNames?.[provider] || "";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "TEST_CONNECTION",
        provider,
        apiKey,
        baseUrl,
        model,
      });

      if (response.success) {
        setTestResult({ success: true, message: response.data });
      } else {
        setTestResult({ success: false, message: response.error });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  if (!config)
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#a0aec0",
          backgroundColor: "var(--theme-background, #f9fafb)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "var(--theme-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid var(--theme-border, #e2e8f0)",
              borderTopColor: "var(--theme-primary, #3498db)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }}
          ></div>
          <p>{I18nService.t("loading")}</p>
        </div>

        <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
      </div>
    );

  const renderModelSelector = () => {
    return (
      <ModelSelector
        isLoadingModels={isLoadingModels}
        models={models}
        modelError={modelError}
        config={config}
        setConfig={setConfig}
      />
    );
  };

  const showBaseUrlInput = shouldShowBaseUrlInput(config.selectedProvider);

  const PLATFORMS: Array<{
    id: PlatformId;
    name: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "general",
      name: I18nService.t("settings_general"),
      icon: <span style={{ fontSize: "24px" }}>⚙️</span>,
    },
    { id: "zhihu", name: I18nService.t("settings_zhihu"), icon: ZhihuIcon },
    { id: "reddit", name: I18nService.t("settings_reddit"), icon: RedditIcon },
    {
      id: "twitter",
      name: I18nService.t("settings_twitter"),
      icon: TwitterIcon,
    },
    { id: "quora", name: I18nService.t("settings_quora"), icon: QuoraIcon },
    {
      id: "history",
      name: I18nService.t("settings_history"),
      icon: <span style={{ fontSize: "24px" }}>📅</span>,
    },
    {
      id: "debug",
      name: I18nService.t("settings_debug"),
      icon: <span style={{ fontSize: "24px" }}>🛠️</span>,
    },
    {
      id: "version",
      name: I18nService.t("version_info"),
      icon: <span style={{ fontSize: "24px" }}>ℹ️</span>,
    },
  ];

  const renderPlatformSettings = (platform: PlatformId) => {
    switch (platform) {
      case "general":
        return (
          <div>
            <GeneralSettings
              config={config}
              setConfig={setConfig}
              isTesting={isTesting}
              testResult={testResult}
              handleTestConnection={handleTestConnection}
              renderModelSelector={renderModelSelector}
              handleSave={() => handleConfigChange({ ...config })}
            />
            <ThemeSettings config={config} setConfig={handleConfigChange} />
          </div>
        );
      case "zhihu":
        return (
          <PlatformSpecificSettings
            config={config}
            setConfig={handleConfigChange}
            platform="zhihu"
          />
        );
      case "reddit":
        return (
          <PlatformSpecificSettings
            config={config}
            setConfig={handleConfigChange}
            platform="reddit"
          />
        );
      case "twitter":
        return (
          <PlatformSpecificSettings
            config={config}
            setConfig={handleConfigChange}
            platform="twitter"
          />
        );
      case "quora":
        return (
          <PlatformSpecificSettings
            config={config}
            setConfig={handleConfigChange}
            platform="quora"
          />
        );
      case "history":
        return (
          <HistorySection
            historyRecords={historyRecords}
            loadingHistory={loadingHistory}
            isExporting={isExporting}
            handleDeleteProfile={handleDeleteProfile}
            handleDeleteUser={handleDeleteUser}
            handleClearAllHistory={handleClearAllHistory}
            handleExportMarkdown={handleExportMarkdown}
            handleExportImage={handleExportImage}
          />
        );
      case "debug":
        return <DebugSettings config={config} setConfig={handleConfigChange} />;
      case "version":
        return (
          <VersionInfo changelog={changelog} versionHistory={versionHistory} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "36px 20px",
        fontFamily:
          "var(--theme-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)",
        backgroundColor: "var(--theme-background, #f9fafb)",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 45%), radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.15), transparent 40%), radial-gradient(circle at 85% 10%, rgba(56, 189, 248, 0.12), transparent 30%)",
        color: "var(--theme-text, #4a5568)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: "40px",
            padding: "20px 0",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              background:
                "linear-gradient(135deg, var(--theme-primary, #3498db), var(--theme-secondary, #22d3ee))",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 14px 30px rgba(37, 99, 235, 0.25)",
            }}
          >
            <img
              src={icon}
              alt="DeepProfile Icon"
              style={{ width: "48px", height: "48px" }}
            />
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "var(--theme-text, #1a202c)",
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}
          >
            DeepProfile
          </h1>
          <p
            style={{
              color: "var(--theme-text-secondary, #718096)",
              fontSize: "18px",
              maxWidth: "500px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            {I18nService.t("app_description")}
          </p>
        </header>

        <div
          className="dp-options-layout"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {/* 左侧平台导航栏 */}
          <div
            className="dp-options-nav"
            style={{
              minWidth: "240px",
              backgroundColor: "var(--theme-surface, white)",
              borderRadius: "var(--theme-border-radius-large, 16px)",
              padding: "20px",
              boxShadow:
                "var(--theme-shadow-medium, 0 10px 30px rgba(15, 23, 42, 0.12))",
              border: "1px solid var(--theme-border, #f0f0f0)",
              backdropFilter: "blur(12px)",
              height: "fit-content",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                padding: "0 0 12px 0",
                borderBottom: `1px solid var(--theme-border, #edf2f7)`,
                fontSize: "var(--theme-font-size-medium, 16px)",
                fontWeight: "600",
                color: "var(--theme-text, #4a5568)",
              }}
            >
              {I18nService.t("settings")}
            </h3>
            <nav>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {PLATFORMS.map((platform) => (
                  <li key={platform.id} style={{ margin: "0 0 8px 0" }}>
                    <button
                      onClick={() => setActivePlatform(platform.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "var(--theme-border-radius-medium, 10px)",
                        border: "none",
                        background:
                          activePlatform === platform.id
                            ? "linear-gradient(135deg, var(--theme-primary, #2563eb), var(--theme-secondary, #22d3ee))"
                            : "transparent",
                        color:
                          activePlatform === platform.id
                            ? "var(--theme-primary-text, #ffffff)"
                            : "var(--theme-text, #4a5568)",
                        fontWeight:
                          activePlatform === platform.id ? "700" : "500",
                        fontSize: "var(--theme-font-size-medium, 15px)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        ...(activePlatform === platform.id
                          ? {
                              boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
                              transform: "translateX(4px)",
                            }
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "24px",
                        }}
                      >
                        {platform.icon}
                      </span>
                      {platform.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 右侧内容区域 */}
          <div className="dp-options-content" style={{ flex: 1 }}>
            {renderPlatformSettings(activePlatform)}
          </div>
        </div>

        {status && (
          <div
            style={{
              position: "fixed",
              bottom: "90px",
              left: "50%",
              transform: "translateX(-50%)",
              background:
                "linear-gradient(135deg, var(--theme-primary, #2563eb), var(--theme-secondary, #22d3ee))",
              color: "var(--theme-primary-text, #ffffff)",
              padding: "14px 28px",
              borderRadius: "30px",
              boxShadow: "0 12px 30px rgba(37, 99, 235, 0.35)",
              fontWeight: "600",
              fontSize: "var(--theme-font-size-medium, 15px)",
              animation:
                "slideIn 0.4s ease-out forwards, fadeOut 0.5s ease-out 2.5s forwards",
              zIndex: 1000,
            }}
          >
            ✅ {status}
          </div>
        )}

        <style>{`
          @keyframes slideIn {
            from { bottom: -50px; opacity: 0; }
            to { bottom: 90px; opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @media (max-width: 980px) {
            .dp-options-layout {
              flex-direction: column;
            }
            .dp-options-nav {
              width: 100%;
              min-width: unset;
            }
            .dp-options-content {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

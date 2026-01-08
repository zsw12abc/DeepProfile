import React, { useEffect, useState, useCallback } from "react"
import { ConfigService } from "~services/ConfigService"
import { HistoryService } from "~services/HistoryService"
import { TopicService, type MacroCategory } from "~services/TopicService"
import { calculateFinalLabel } from "~services/LabelUtils"
import { ExportService } from "~services/ExportService"
import { DEFAULT_CONFIG, type AIProvider, type AppConfig, type AnalysisMode, type SupportedPlatform, type UserHistoryRecord, type ProfileData, type Language } from "~types"
import icon from "data-base64:../assets/icon.png"
import html2canvas from "html2canvas"
import { ZhihuClient } from "~services/ZhihuClient"
import { I18nService } from "~services/I18nService"
import MarkdownRenderer from "~components/MarkdownRenderer"
import zhCNChangelog from "data-text:./locales/zh-CN/CHANGELOG.md"
import enUSChangelog from "data-text:./locales/en-US/CHANGELOG.md"
import { GeneralSettings } from "~components/PlatformSettings"
import { PlatformSpecificSettings } from "~components/PlatformSettings"
import { DebugSettings } from "~components/PlatformSettings"
import { HistorySection } from "~components/HistorySection"
import { VersionInfo } from "~components/VersionInfo"
import { ZhihuIcon, RedditIcon, getBaseUrlPlaceholder, shouldShowBaseUrlInput } from "~components/HelperComponents"
import { ModelSelector } from "~components/ModelSelector"

// 获取版本信息
const getVersion = (): string => {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest.version;
  } catch (e) {
    return "0.5.1"; // Fallback
  }
};

// 新增函数：获取CHANGELOG内容
const fetchChangelogContent = async (lang: string): Promise<string> => {
  if (lang === 'zh-CN') {
    return zhCNChangelog;
  } else {
    return enUSChangelog;
  }
};

type PlatformId = 'general' | 'zhihu' | 'reddit' | 'debug' | 'history' | 'version';

export default function Options() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activePlatform, setActivePlatform] = useState<PlatformId>('general')
  
  const [historyRecords, setHistoryRecords] = useState<UserHistoryRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [changelog, setChangelog] = useState("");

  // Force re-render when language changes
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  useEffect(() => {
    ConfigService.getConfig().then((c) => {
        setConfig({ ...DEFAULT_CONFIG, ...c })
        I18nService.setLanguage(c.language || 'zh-CN');
        forceUpdate();
    })
  }, [])

  useEffect(() => {
    const fetchChangelog = async () => {
        if (!config?.language) return;

        const lang = config.language;
        const changelogText = await fetchChangelogContent(lang);
        setChangelog(changelogText);
    };

    if (config) {
        fetchChangelog();
    }
  }, [config?.language]);

  useEffect(() => {
    if (activePlatform === 'history') {
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

  const handleDeleteProfile = async (userId: string, platform: SupportedPlatform, category: string) => {
    if (confirm(I18nService.t('confirm_delete'))) {
      await HistoryService.deleteProfile(userId, platform, category);
      await loadHistory(); // Reload list
    }
  };

  const handleDeleteUser = async (userId: string, platform: SupportedPlatform) => {
    if (confirm(I18nService.t('confirm_delete'))) {
      await HistoryService.deleteUserRecord(userId, platform);
      await loadHistory(); // Reload list
    }
  };

  const handleClearAllHistory = async () => {
    if (confirm(I18nService.t('confirm_clear_all'))) {
      await HistoryService.clearAll();
      await loadHistory(); // Reload list
    }
  };

  const handleExportMarkdown = (profileData: ProfileData, category: MacroCategory, userId: string, timestamp: number) => {
    const userHomeUrl = `https://www.zhihu.com/people/${userId}`;
    const nickname = profileData.nickname || `${I18nService.t('unknown_user')}${userId}`;
    const md = ExportService.toMarkdown(profileData, category, userHomeUrl, timestamp);
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeepProfile_${nickname}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async (profileData: ProfileData, category: MacroCategory, userId: string, timestamp: number, userInfo?: any) => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      const nickname = userInfo?.name || profileData.nickname || `${I18nService.t('unknown_user')}${userId}`;
      const topicClassification = profileData.topic_classification || I18nService.t('topic_classification');
      const summary = profileData.summary || "";
      const valueOrientation = profileData.value_orientation || [];
      const dateStr = new Date(timestamp).toLocaleDateString(config?.language === 'en-US' ? 'en-US' : 'zh-CN');
      
      // 创建一个临时的、样式化的容器用于截图
      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'absolute';
      exportContainer.style.top = '-9999px';
      exportContainer.style.left = '-9999px';
      exportContainer.style.width = '400px'; // 固定宽度
      exportContainer.style.backgroundColor = '#f0f2f5';
      exportContainer.style.padding = '20px';
      exportContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      document.body.appendChild(exportContainer);

      // 渲染价值取向条
      let valueOrientationHtml = '';
      if (valueOrientation && valueOrientation.length > 0) {
          valueOrientationHtml = valueOrientation.map(item => {
              const { label: labelName, score } = item;
              const { label, percentage } = calculateFinalLabel(labelName, score);
              const intensity = Math.min(100, percentage);
              const color = score >= 0 
                ? `hsl(210, 70%, ${70 - intensity * 0.3}%)`
                : `hsl(0, 70%, ${70 - Math.abs(intensity) * 0.3}%)`;
              
              return `
                <div style="display: flex; align-items: center; margin-bottom: 8px; font-size: 12px;">
                    <span style="width: 100px; font-weight: 500; color: #333;">${label}</span>
                    <div style="flex: 1; height: 8px; background-color: #e0e0e0; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background-color: ${color}; border-radius: 4px;"></div>
                    </div>
                    <span style="width: 30px; text-align: right; font-size: 11px; color: #666;">${Math.round(percentage)}%</span>
                </div>
              `;
          }).join('');
      }

      let avatarSrc = icon;
      if (userInfo?.avatar_url) {
        const base64Avatar = await ZhihuClient.fetchImageAsBase64(userInfo.avatar_url);
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
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">DeepProfile ${I18nService.t('app_description')}</div>
                    </div>
                </div>
                <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                    <div style="font-size: 10px; opacity: 0.8;">Date</div>
                    <div style="font-size: 14px; font-weight: 600;">${dateStr}</div>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t('topic_classification')}</div>
                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; background-color: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${topicClassification}</div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t('ai_summary')}</div>
                    <div style="font-size: 14px; line-height: 1.6; color: #444; background-color: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 3px solid #0084ff;">
                        ${summary}
                    </div>
                </div>

                ${valueOrientationHtml ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${I18nService.t('value_orientation')}</div>
                    ${valueOrientationHtml}
                </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #e0e0e0; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${qrCodeUrl}" style="width: 48px; height: 48px; border-radius: 4px;" crossOrigin="anonymous" />
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #1a1a1a;">DeepProfile</div>
                            <div style="font-size: 10px; color: #8590a6;">AI-powered User Profile Analysis</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #999; text-align: right;">
                        Scan to install<br/>Start your AI journey
                    </div>
                </div>
            </div>
      `;

      // 等待图片加载
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
        logging: false
      });
      
      const image = canvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = image;
      a.download = `DeepProfile_Card_${nickname}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      document.body.removeChild(exportContainer);
    } catch (e) {
      console.error("Export image failed:", e);
      alert(I18nService.t('export_image_failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const fetchModels = useCallback(async (provider: AIProvider, apiKey: string, baseUrl: string) => {
    if (!apiKey && provider !== 'ollama') {
        setModels([]);
        return;
    }
    
    setIsLoadingModels(true)
    setModelError(null)
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: "LIST_MODELS",
        provider,
        apiKey,
        baseUrl
      })
      if (response.success) {
        setModels(response.data)
      } else {
        setModelError(response.error || "Failed to fetch models")
      }
    } catch (e: any) {
      setModelError(e.message)
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  useEffect(() => {
    if (config) {
      const timer = setTimeout(() => {
          fetchModels(
            config.selectedProvider, 
            config.apiKeys[config.selectedProvider] || "", 
            config.customBaseUrls[config.selectedProvider] || ""
          )
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [config?.selectedProvider, config?.apiKeys, config?.customBaseUrls, fetchModels])

  const handleSave = async () => {
    if (!config) return
    
    // Check if language has changed
    const oldConfig = await ConfigService.getConfig();
    const languageChanged = oldConfig.language !== config.language;
    
    await ConfigService.saveConfig(config)
    I18nService.setLanguage(config.language);
    
    // If language changed, refresh label cache to update labels in the new language
    if (languageChanged) {
      const labelService = LabelService.getInstance();
      labelService.refreshCategories();
      
      // Also invalidate the label cache
      const { invalidateLabelCache } = await import('~services/LabelDefinitions');
      invalidateLabelCache();
    }
    
    forceUpdate();
    setStatus(I18nService.t('saved'))
    setTimeout(() => setStatus(""), 3000)
  }

  const handleTestConnection = async () => {
    if (!config) return
    setIsTesting(true)
    setTestResult(null)
    
    const provider = config.selectedProvider
    const apiKey = config.apiKeys[provider] || ""
    const baseUrl = config.customBaseUrls[provider] || ""
    const model = config.customModelNames?.[provider] || ""

    try {
        const response = await chrome.runtime.sendMessage({
            type: "TEST_CONNECTION",
            provider,
            apiKey,
            baseUrl,
            model
        })
        
        if (response.success) {
            setTestResult({ success: true, message: response.data })
        } else {
            setTestResult({ success: false, message: response.error })
        }
    } catch (e: any) {
        setTestResult({ success: false, message: e.message })
    } finally {
        setIsTesting(false)
    }
  }

  if (!config) return <div style={{ 
    padding: "40px", 
    textAlign: "center", 
    color: "#a0aec0",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  }}>
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        border: "3px solid #e2e8f0",
        borderTopColor: "#3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
      }}></div>
      <p>{I18nService.t('loading')}</p>
    </div>
    
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>

  const renderModelSelector = () => {
    return <ModelSelector 
      isLoadingModels={isLoadingModels}
      models={models}
      modelError={modelError}
      config={config}
      setConfig={setConfig}
    />;
  }

  const showBaseUrlInput = shouldShowBaseUrlInput(config.selectedProvider);

  const PLATFORMS = [
    { id: 'general', name: I18nService.t('settings_general'), icon: <span style={{ fontSize: "24px" }}>⚙️</span> },
    { id: 'zhihu', name: I18nService.t('settings_zhihu'), icon: ZhihuIcon },
    { id: 'reddit', name: I18nService.t('settings_reddit'), icon: RedditIcon },
    { id: 'history', name: I18nService.t('settings_history'), icon: <span style={{ fontSize: "24px" }}>📅</span> },
    { id: 'debug', name: I18nService.t('settings_debug'), icon: <span style={{ fontSize: "24px" }}>🛠️</span> },
    { id: 'version', name: I18nService.t('version_info'), icon: <span style={{ fontSize: "24px" }}>ℹ️</span> },
  ];

  const renderPlatformSettings = (platformId: PlatformId) => {
    switch (platformId) {
      case 'general':
        return (
          <GeneralSettings 
            config={config} 
            setConfig={setConfig} 
            isTesting={isTesting}
            testResult={testResult}
            handleTestConnection={handleTestConnection}
            renderModelSelector={renderModelSelector}
          />
        );
      case 'zhihu':
        return <PlatformSpecificSettings config={config} setConfig={setConfig} platform="zhihu" />;
      case 'reddit':
        return <PlatformSpecificSettings config={config} setConfig={setConfig} platform="reddit" />;
      case 'history':
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
      case 'debug':
        return <DebugSettings config={config} setConfig={setConfig} />;
      case 'version':
        return <VersionInfo changelog={changelog} />;
      default:
        return null;
    }
  }

  return (
    <div style={{ 
        minHeight: "100vh",
        padding: "30px 20px", 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundColor: "#f9fafb",
        color: "#4a5568",
        display: "flex",
        flexDirection: "column"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <header style={{ 
          textAlign: "center", 
          marginBottom: "40px",
          padding: "20px 0"
        }}>
            <div style={{
              width: "70px",
              height: "70px",
              backgroundColor: "#3498db",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 6px 12px rgba(52, 152, 219, 0.2)"
            }}>
              <img src={icon} alt="DeepProfile Icon" style={{ width: "48px", height: "48px" }} />
            </div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: "800", 
              color: "#1a202c", 
              marginBottom: "8px",
              letterSpacing: "-0.5px"
            }}>DeepProfile</h1>
            <p style={{ 
              color: "#718096", 
              fontSize: "18px",
              maxWidth: "500px",
              margin: "0 auto",
              lineHeight: "1.6"
            }}>{I18nService.t('app_description')}</p>
        </header>
        
        <div style={{
          display: "flex",
          flexDirection: "row",
          gap: "24px",
          flexWrap: "nowrap"
        }}>
          {/* 左侧平台导航栏 */}
          <div style={{
            minWidth: "240px",
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            border: "1px solid #f0f0f0",
            height: "fit-content"
          }}>
            <h3 style={{
              margin: "0 0 20px 0",
              padding: "0 0 12px 0",
              borderBottom: "1px solid #edf2f7",
              fontSize: "16px",
              fontWeight: "600",
              color: "#4a5568"
            }}>
              {I18nService.t('settings')}
            </h3>
            <nav>
              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0
              }}>
                {PLATFORMS.map((platform) => (
                  <li key={platform.id} style={{ margin: "0 0 8px 0" }}>
                    <button
                      onClick={() => setActivePlatform(platform.id as PlatformId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        border: "none",
                        backgroundColor: activePlatform === platform.id 
                          ? "#e1f0fa" 
                          : "transparent",
                        color: activePlatform === platform.id 
                          ? "#2980b9" 
                          : "#4a5568",
                        fontWeight: activePlatform === platform.id 
                          ? "700" 
                          : "500",
                        fontSize: "15px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        ...(activePlatform === platform.id 
                          ? { 
                              boxShadow: "0 4px 8px rgba(52, 152, 219, 0.15)",
                              transform: "translateX(4px)"
                            } 
                          : {})
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px" }}>{platform.icon}</span>
                      {platform.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          
          {/* 右侧内容区域 */}
          <div style={{ flex: 1 }}>
            {renderPlatformSettings(activePlatform)}
            
            <div style={{ 
              position: "sticky", 
              bottom: "30px", 
              zIndex: 100,
              marginTop: "20px"
            }}>
                <button
                    onClick={handleSave}
                    style={{
                    padding: "18px",
                    backgroundColor: "#3498db",
                    color: "white",
                    border: "none",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "17px",
                    fontWeight: "700",
                    width: "100%",
                    boxShadow: "0 6px 16px rgba(52, 152, 219, 0.4)",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden"
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                    {I18nService.t('save')}
                </button>
            </div>
          </div>
        </div>

        {status && (
            <div style={{ 
                position: "fixed", 
                bottom: "90px", 
                left: "50%", 
                transform: "translateX(-50%)",
                backgroundColor: "#2d3748",
                color: "white",
                padding: "14px 28px",
                borderRadius: "30px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                fontWeight: "600",
                fontSize: "15px",
                animation: "slideIn 0.4s ease-out forwards, fadeOut 0.5s ease-out 2.5s forwards",
                zIndex: 1000
            }}>
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
        `}</style>
      </div>
    </div>
  )
}

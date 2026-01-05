import React, { useEffect, useState, useCallback } from "react"
import { ConfigService } from "~services/ConfigService"
import { HistoryService } from "~services/HistoryService"
import { TopicService, type MacroCategory } from "~services/TopicService"
import { calculateFinalLabel } from "~services/LabelUtils"
import { ExportService } from "~services/ExportService"
import { DEFAULT_CONFIG, type AIProvider, type AppConfig, type AnalysisMode, type SupportedPlatform, type UserHistoryRecord, type ProfileData } from "~types"
import icon from "data-base64:../assets/icon.png"
import html2canvas from "html2canvas"
import { ZhihuClient } from "~services/ZhihuClient"

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI Compatible)" }
]

const ZhihuIcon = <img src="https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.a53ae37b.png" alt="Zhihu" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "contain" }} />;
const RedditIcon = <img src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-120x120.png" alt="Reddit" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "contain" }} />;

const PLATFORMS = [
  { id: 'general', name: '通用设置', icon: <span style={{ fontSize: "24px" }}>⚙️</span> },
  { id: 'zhihu', name: '知乎设置', icon: ZhihuIcon },
  { id: 'reddit', name: 'Reddit 设置', icon: RedditIcon },
  { id: 'history', name: '历史记录', icon: <span style={{ fontSize: "24px" }}>📅</span> },
  { id: 'debug', name: '开发者选项', icon: <span style={{ fontSize: "24px" }}>🛠️</span> },
]

type PlatformId = 'general' | 'zhihu' | 'reddit' | 'debug' | 'history';

const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
  <div style={{
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "28px",
    marginBottom: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
    transition: "transform 0.3s ease, box-shadow 0.3s ease"
  }}>
    <h2 style={{ 
        fontSize: "20px", 
        margin: "0 0 24px 0", 
        color: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontWeight: "600"
    }}>
        {icon && <span style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>{icon}</span>}
        {title}
    </h2>
    {children}
  </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode; subLabel?: string }> = ({ label, children, subLabel }) => (
    <div style={{ marginBottom: "24px" }}>
        <label style={{ 
          display: "block", 
          marginBottom: "10px", 
          fontWeight: "600", 
          color: "#2d3748", 
          fontSize: "15px",
          alignItems: "center",
          gap: "6px"
        }}>
            {label}
        </label>
        {children}
        {subLabel && <div style={{ fontSize: "13px", color: "#718096", marginTop: "6px", lineHeight: "1.5" }}>{subLabel}</div>}
    </div>
)

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

  useEffect(() => {
    ConfigService.getConfig().then((c) => {
        setConfig({ ...DEFAULT_CONFIG, ...c })
    })
  }, [])

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
    if (confirm(`确定要删除用户 ${userId} 的【${TopicService.getCategoryName(category as MacroCategory)}】画像吗？`)) {
      await HistoryService.deleteProfile(userId, platform, category);
      await loadHistory(); // Reload list
    }
  };

  const handleDeleteUser = async (userId: string, platform: SupportedPlatform) => {
    if (confirm(`确定要删除用户 ${userId} 的所有历史记录吗？`)) {
      await HistoryService.deleteUserRecord(userId, platform);
      await loadHistory(); // Reload list
    }
  };

  const handleClearAllHistory = async () => {
    if (confirm("确定要清空所有历史记录吗？此操作不可恢复。")) {
      await HistoryService.clearAll();
      await loadHistory(); // Reload list
    }
  };

  const handleExportMarkdown = (profileData: ProfileData, category: MacroCategory, userId: string, timestamp: number) => {
    const userHomeUrl = `https://www.zhihu.com/people/${userId}`;
    const nickname = profileData.nickname || `用户${userId}`;
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
      const nickname = userInfo?.name || profileData.nickname || `用户${userId}`;
      const topicClassification = profileData.topic_classification || "未知话题";
      const summary = profileData.summary || "";
      const valueOrientation = profileData.value_orientation || [];
      const dateStr = new Date(timestamp).toLocaleDateString('zh-CN');
      
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
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">DeepProfile 用户画像分析</div>
                    </div>
                </div>
                <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                    <div style="font-size: 10px; opacity: 0.8;">生成日期</div>
                    <div style="font-size: 14px; font-weight: 600;">${dateStr}</div>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">核心话题</div>
                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; background-color: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${topicClassification}</div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">AI 总结</div>
                    <div style="font-size: 14px; line-height: 1.6; color: #444; background-color: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 3px solid #0084ff;">
                        ${summary}
                    </div>
                </div>

                ${valueOrientationHtml ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #8590a6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">价值取向图谱</div>
                    ${valueOrientationHtml}
                </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #e0e0e0; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${qrCodeUrl}" style="width: 48px; height: 48px; border-radius: 4px;" crossOrigin="anonymous" />
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #1a1a1a;">DeepProfile</div>
                            <div style="font-size: 10px; color: #8590a6;">AI 驱动的用户画像分析</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #999; text-align: right;">
                        扫码安装插件<br/>开启你的 AI 分析之旅
                    </div>
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
      alert("图片导出失败，请重试");
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
    await ConfigService.saveConfig(config)
    setStatus("配置已保存!")
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
      <p>正在加载配置...</p>
    </div>
    
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>

  const renderModelSelector = () => {
    if (isLoadingModels) {
      return <div style={{ 
        color: "#718096", 
        fontSize: "14px", 
        padding: "14px", 
        backgroundColor: "#f8fafc", 
        borderRadius: "10px", 
        display: "flex", 
        alignItems: "center", 
        gap: "8px"
      }}>⏳ 正在加载模型列表...</div>
    }
    
    const hasModels = models.length > 0;
    
    return (
      <>
        {hasModels ? (
            <div style={{ position: "relative" }}>
                <select
                value={config.customModelNames?.[config.selectedProvider] || ""}
                onChange={(e) =>
                    setConfig({
                    ...config,
                    customModelNames: {
                        ...config.customModelNames,
                        [config.selectedProvider]: e.target.value
                    }
                    })
                }
                style={{ 
                    padding: "14px", 
                    width: "100%", 
                    borderRadius: "10px", 
                    border: "2px solid #e2e8f0", 
                    backgroundColor: "#fff",
                    fontSize: "15px",
                    appearance: "none",
                    backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234a5568%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px top 50%",
                    backgroundSize: "12px auto"
                }}
                >
                <option value="">-- 选择模型 --</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
        ) : (
            <input
              type="text"
              value={config.customModelNames?.[config.selectedProvider] || ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  customModelNames: {
                    ...config.customModelNames,
                    [config.selectedProvider]: e.target.value
                  }
                })
              }
              style={{ 
                padding: "14px", 
                width: "100%", 
                borderRadius: "10px", 
                border: "2px solid #e2e8f0", 
                fontSize: "15px",
                backgroundColor: "#fff"
              }}
              placeholder="手动输入模型名称 (如 gpt-4o)"
            />
        )}
        
        {modelError && (
            <div style={{ 
              color: "#e53e3e", 
              fontSize: "13px", 
              marginTop: "8px", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              backgroundColor: "#fed7d7",
              padding: "10px",
              borderRadius: "8px"
            }}>
                ⚠️ 无法自动获取模型列表 ({modelError})。请手动输入。
            </div>
        )}
      </>
    )
  }

  const getBaseUrlPlaceholder = (provider: AIProvider) => {
      switch(provider) {
          case 'ollama': return "http://localhost:11434";
          case 'qwen': return "https://dashscope.aliyuncs.com/compatible-mode/v1";
          case 'deepseek': return "https://api.deepseek.com/v1";
          case 'custom': return "https://api.example.com/v1";
          default: return "https://api.openai.com/v1";
      }
  }

  const showBaseUrlInput = config.selectedProvider === "ollama" || 
                           config.selectedProvider === "custom" || 
                           config.selectedProvider === "qwen" ||
                           config.selectedProvider === "deepseek" ||
                           config.selectedProvider === "openai";

  const renderPlatformSettings = (platformId: PlatformId) => {
    switch (platformId) {
      case 'general':
        return (
          <Card title="AI 模型配置 (通用)" icon={<span style={{ fontSize: "24px" }}>🤖</span>}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              padding: "16px",
              backgroundColor: config.globalEnabled ? "#f0fff4" : "#fff5f5",
              borderRadius: "10px",
              marginBottom: "24px",
              border: `1px solid ${config.globalEnabled ? "#c6f6d5" : "#feb2b2"}`
            }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="globalEnabled" style={{ 
                  fontWeight: "700", 
                  cursor: "pointer", 
                  fontSize: "16px",
                  color: config.globalEnabled ? "#22543d" : "#742a2a",
                  display: "block"
                }}>
                    {config.globalEnabled ? "✅ 插件已启用" : "⛔ 插件已禁用"}
                </label>
                <div style={{ fontSize: "13px", color: config.globalEnabled ? "#2f855a" : "#9b2c2c", marginTop: "4px" }}>
                  {config.globalEnabled ? "DeepProfile 正在正常工作，将在目标网站显示分析按钮。" : "DeepProfile 已完全关闭，不会在任何网站注入代码。"}
                </div>
              </div>
              <div style={{ position: "relative", width: "52px", height: "32px" }}>
                <input
                    type="checkbox"
                    id="globalEnabled"
                    checked={config.globalEnabled}
                    onChange={(e) => setConfig({ ...config, globalEnabled: e.target.checked })}
                    style={{ 
                      opacity: 0,
                      width: 0,
                      height: 0
                    }}
                />
                <label htmlFor="globalEnabled" style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: config.globalEnabled ? "#48bb78" : "#ccc",
                  transition: ".4s",
                  borderRadius: "34px"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "24px",
                    width: "24px",
                    left: config.globalEnabled ? "24px" : "4px",
                    bottom: "4px",
                    backgroundColor: "white",
                    transition: ".4s",
                    borderRadius: "50%"
                  }}></span>
                </label>
              </div>
            </div>

            <InputGroup label="AI 服务商">
              <div style={{ position: "relative" }}>
                  <select
                      value={config.selectedProvider}
                      onChange={(e) =>
                      setConfig({ ...config, selectedProvider: e.target.value as AIProvider })
                      }
                      style={{ 
                          padding: "14px", 
                          width: "100%", 
                          borderRadius: "10px", 
                          border: "2px solid #e2e8f0",
                          backgroundColor: "#fff",
                          fontSize: "15px",
                          appearance: "none",
                          backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234a5568%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 14px top 50%",
                          backgroundSize: "12px auto"
                      }}>
                      {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                          {p.label}
                      </option>
                      ))}
                  </select>
              </div>
            </InputGroup>

            <InputGroup label="API Key">
              <input
                  type="password"
                  value={config.apiKeys[config.selectedProvider] || ""}
                  onChange={(e) =>
                  setConfig({
                      ...config,
                      apiKeys: {
                      ...config.apiKeys,
                      [config.selectedProvider]: e.target.value
                      }
                  })
                  }
                  style={{ 
                    padding: "14px", 
                    width: "100%", 
                    borderRadius: "10px", 
                    border: "2px solid #e2e8f0", 
                    fontSize: "15px",
                    backgroundColor: "#fff"
                  }}
                  placeholder={`请输入 API Key`}
              />
            </InputGroup>

            {showBaseUrlInput && (
              <InputGroup label={`API Base URL ${config.selectedProvider === 'custom' ? '(必填)' : '(可选)'}`}>
                  <input
                  type="text"
                  value={config.customBaseUrls[config.selectedProvider] || ""}
                  onChange={(e) =>
                      setConfig({
                      ...config,
                      customBaseUrls: {
                          ...config.customBaseUrls,
                          [config.selectedProvider]: e.target.value
                      }
                      })
                  }
                  style={{ 
                    padding: "14px", 
                    width: "100%", 
                    borderRadius: "10px", 
                    border: "2px solid #e2e8f0", 
                    fontSize: "15px",
                    backgroundColor: "#fff"
                  }}
                  placeholder={getBaseUrlPlaceholder(config.selectedProvider)}
                  />
              </InputGroup>
            )}

            <InputGroup label="模型选择">
              {renderModelSelector()}
            </InputGroup>

            <div style={{ 
              marginTop: "28px", 
              paddingTop: "24px", 
              borderTop: "1px solid #edf2f7",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{
                      padding: "12px 20px",
                      backgroundColor: isTesting ? "#cbd5e0" : "#3498db",
                      border: "none",
                      borderRadius: "10px",
                      cursor: isTesting ? "not-allowed" : "pointer",
                      fontSize: "15px",
                      color: "white",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      boxShadow: isTesting ? "none" : "0 4px 6px rgba(52, 152, 219, 0.3)"
                  }}
                >
                  {isTesting ? "⏳ 测试中..." : "🔌 测试连接"}
                </button>
                
                {testResult && (
                    <div style={{ 
                        marginTop: "16px", 
                        padding: "16px 20px", 
                        borderRadius: "10px", 
                        backgroundColor: testResult.success ? "#e6ffed" : "#ffeef0",
                        color: testResult.success ? "#22543d" : "#742a2a",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        border: `2px solid ${testResult.success ? "#c6f6d5" : "#feb2b2"}`
                    }}>
                        <strong style={{ display: "block", marginBottom: "6px", fontSize: "15px" }}>
                          {testResult.success ? "✅ 连接成功" : "❌ 连接失败"}
                        </strong>
                        {testResult.message}
                    </div>
                )}
            </div>
          </Card>
        );
      case 'zhihu':
        return (
          <Card title="知乎设置" icon={ZhihuIcon}>
            <InputGroup 
              label="分析模式" 
              subLabel={
                  config.analysisMode === 'fast' ? "⚡ 极速模式：仅做快速总结，适合概览。" :
                  config.analysisMode === 'balanced' ? "⚖️ 平衡模式：标准分析，兼顾速度与质量。" :
                  "🧠 深度模式：启用思维链 (CoT)，深入识别反讽、隐喻，耗时较长。"
              }
            >
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {(['fast', 'balanced', 'deep'] as AnalysisMode[]).map((mode) => (
                  <button
                      key={mode}
                      onClick={() => setConfig({ ...config, analysisMode: mode })}
                      style={{
                      flex: "1",
                      minWidth: "120px",
                      padding: "14px",
                      borderRadius: "10px",
                      border: config.analysisMode === mode ? "2px solid #3498db" : "2px solid #e2e8f0",
                      backgroundColor: config.analysisMode === mode ? "#e1f0fa" : "white",
                      color: config.analysisMode === mode ? "#2980b9" : "#4a5568",
                      cursor: "pointer",
                      fontWeight: config.analysisMode === mode ? "700" : "600",
                      fontSize: "15px",
                      transition: "all 0.2s",
                      boxShadow: config.analysisMode === mode ? "0 4px 8px rgba(52, 152, 219, 0.15)" : "0 2px 4px rgba(0,0,0,0.05)"
                      }}>
                      {mode === 'fast' && '⚡ 极速'}
                      {mode === 'balanced' && '⚖️ 平衡'}
                      {mode === 'deep' && '🧠 深度'}
                  </button>
                  ))}
              </div>
            </InputGroup>

            <InputGroup label={`分析最近回答数量: ${config.analyzeLimit || 15}`}>
              <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={config.analyzeLimit || 15}
                  onChange={(e) =>
                  setConfig({ ...config, analyzeLimit: parseInt(e.target.value) })
                  }
                  style={{ width: "100%", accentColor: "#3498db", height: "8px", borderRadius: "4px", border: "none" }}
              />
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                fontSize: "13px", 
                color: "#718096", 
                marginTop: "6px",
                position: "relative"
              }}>
                  <span>5</span>
                  <span style={{ textAlign: "center", fontWeight: "600", color: "#2d3748" }}>{config.analyzeLimit || 15}</span>
                  <span>50</span>
              </div>
            </InputGroup>
          </Card>
        );
      case 'reddit':
        return (
          <Card title="Reddit 设置" icon={RedditIcon}>
              <div style={{ 
                  padding: "24px", 
                  backgroundColor: "#f8fafc", 
                  borderRadius: "10px", 
                  color: "#a0aec0", 
                  fontSize: "15px",
                  textAlign: "center",
                  border: "1px dashed #e2e8f0"
              }}>
                  🚧 Reddit 平台支持正在开发中...
              </div>
          </Card>
        );
      case 'history':
        return (
          <Card title="历史记录管理" icon={<span style={{ fontSize: "24px" }}>📅</span>}>
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: "#666" }}>
                共 {historyRecords.length} 位用户记录 (最多 {200} 位)
              </div>
              {historyRecords.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#fee2e2",
                    color: "#c53030",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  🗑️ 清空所有
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#a0aec0" }}>
                加载中...
              </div>
            ) : historyRecords.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "10px",
                color: "#a0aec0",
                border: "1px dashed #e2e8f0"
              }}>
                暂无历史记录
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {historyRecords.map((userRecord) => (
                  <details key={`${userRecord.platform}-${userRecord.userId}`} style={{
                    padding: "16px",
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}>
                    <summary style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ 
                          fontSize: "12px", 
                          padding: "2px 6px", 
                          borderRadius: "4px", 
                          backgroundColor: userRecord.platform === 'zhihu' ? '#e1f0fa' : '#ffedd5',
                          color: userRecord.platform === 'zhihu' ? '#2980b9' : '#c05621',
                          fontWeight: "600"
                        }}>
                          {userRecord.platform === 'zhihu' ? '知乎' : 'Reddit'}
                        </span>
                        <span style={{ fontWeight: "600", color: "#2d3748" }}>
                          {userRecord.userInfo?.name || Object.values(userRecord.profiles)[0]?.profileData.nickname || userRecord.userId}
                        </span>
                        <span style={{ fontSize: "13px", color: "#a0aec0" }}>({userRecord.userId})</span>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDeleteUser(userRecord.userId, userRecord.platform); }}
                        style={{
                          padding: "8px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "16px",
                          color: "#cbd5e0",
                          transition: "color 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.color = "#e53e3e"}
                        onMouseOut={e => e.currentTarget.style.color = "#cbd5e0"}
                        title="删除此用户所有记录"
                      >
                        ×
                      </button>
                    </summary>
                    <div style={{ marginTop: "16px", borderTop: "1px solid #f0f0f0", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Object.values(userRecord.profiles).map(profile => {
                        const date = new Date(profile.timestamp);
                        const timeStr = date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const categoryName = TopicService.getCategoryName(profile.category as MacroCategory);
                        const summary = profile.profileData.summary;
                        const labels = profile.profileData.value_orientation || profile.profileData.political_leaning || [];

                        return (
                          <details key={profile.category} style={{ fontSize: "13px", color: "#4a5568", padding: "8px", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                            <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                              <div>
                                <div style={{ fontWeight: "500" }}>{categoryName}</div>
                                <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "2px" }}>🕒 {timeStr}</div>
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    handleExportMarkdown(profile.profileData as ProfileData, profile.category as MacroCategory, userRecord.userId, profile.timestamp); 
                                  }}
                                  style={{
                                    padding: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    color: "#cbd5e0",
                                    transition: "color 0.2s"
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = "#3498db"}
                                  onMouseOut={e => e.currentTarget.style.color = "#cbd5e0"}
                                  title="导出为 Markdown"
                                >
                                  📝
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    handleExportImage(profile.profileData as ProfileData, profile.category as MacroCategory, userRecord.userId, profile.timestamp, userRecord.userInfo); 
                                  }}
                                  style={{
                                    padding: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: isExporting ? "wait" : "pointer",
                                    fontSize: "14px",
                                    color: "#cbd5e0",
                                    transition: "color 0.2s",
                                    opacity: isExporting ? 0.5 : 1
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = "#3498db"}
                                  onMouseOut={e => e.currentTarget.style.color = "#cbd5e0"}
                                  title="导出为图片"
                                  disabled={isExporting}
                                >
                                  📸
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); handleDeleteProfile(userRecord.userId, userRecord.platform, profile.category); }}
                                  style={{
                                    padding: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    color: "#cbd5e0",
                                    transition: "color 0.2s"
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = "#e53e3e"}
                                  onMouseOut={e => e.currentTarget.style.color = "#cbd5e0"}
                                  title={`删除【${categoryName}】画像`}
                                >
                                  🗑️
                                </button>
                              </div>
                            </summary>
                            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0" }}>
                              <p style={{ margin: "0 0 10px 0", fontStyle: "italic" }}>"{summary}"</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {labels.map((item: { label: string; score: number }, index: number) => {
                                  const { label, percentage } = calculateFinalLabel(item.label, item.score);
                                  return (
                                    <div key={index} style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
                                      <span style={{ width: "80px", fontWeight: "500" }}>{label}</span>
                                      <div style={{ flex: 1, height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${percentage}%`, backgroundColor: item.score > 0 ? "#3498db" : "#e74c3c", borderRadius: "4px" }} />
                                      </div>
                                      <span style={{ width: "30px", textAlign: "right", fontSize: "11px" }}>{percentage}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Card>
        );
      case 'debug':
        return (
          <Card title="开发者选项" icon={<span style={{ fontSize: "24px" }}>🛠️</span>}>
            <div style={{ 
              display: "flex", 
              alignItems: "flex-start", 
              padding: "14px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px"
            }}>
              <input
                  type="checkbox"
                  id="enableDebug"
                  checked={config.enableDebug || false}
                  onChange={(e) =>
                  setConfig({ ...config, enableDebug: e.target.checked })
                  }
                  style={{ 
                    marginRight: "12px", 
                    width: "22px", 
                    height: "22px", 
                    accentColor: "#3498db",
                    marginTop: "2px"
                  }}
              />
              <div>
                <label htmlFor="enableDebug" style={{ 
                  fontWeight: "600", 
                  cursor: "pointer", 
                  fontSize: "15px",
                  color: "#2d3748",
                  display: "block"
                }}>
                    开启调试模式 (Debug Mode)
                </label>
                <div style={{ fontSize: "13px", color: "#718096", marginTop: "6px" }}>
                  开启后，分析结果将包含详细的 Token 消耗、耗时统计和原始数据来源。
                </div>
              </div>
            </div>
          </Card>
        );
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
            }}>AI 驱动的用户画像分析工具</p>
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
              设置菜单
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
                    保存配置
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

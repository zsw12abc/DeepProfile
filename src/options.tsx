import React, { useEffect, useState, useCallback } from "react"
import { ConfigService } from "~services/ConfigService"
import { DEFAULT_CONFIG, type AIProvider, type AppConfig, type AnalysisMode, type SupportedPlatform } from "~types"

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI Compatible)" }
]

const PLATFORMS = [
  { id: 'general', name: '通用设置', icon: '⚙️' },
  { id: 'zhihu', name: '知乎设置', icon: '🔵' },
  { id: 'reddit', name: 'Reddit 设置', icon: '🟠' },
  { id: 'debug', name: '开发者选项', icon: '🛠️' },
]

type PlatformId = 'general' | 'zhihu' | 'reddit' | 'debug';

const Card: React.FC<{ title: string; children: React.ReactNode; icon?: string }> = ({ title, children, icon }) => (
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
        {icon && <span style={{ fontSize: "24px" }}>{icon}</span>}
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
          display: "flex",
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

  useEffect(() => {
    ConfigService.getConfig().then((c) => {
        setConfig({ ...DEFAULT_CONFIG, ...c })
    })
  }, [])

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
        setModels([])
        setModelError(response.error || "Failed to fetch models")
      }
    } catch (e) {
      setModels([])
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
    } catch (e) {
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
          <Card title="AI 模型配置 (通用)" icon="🤖">
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
          <Card title="知乎设置" icon="🔵">
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
          <Card title="Reddit 设置" icon="🟠">
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
      case 'debug':
        return (
          <Card title="开发者选项" icon="🛠️">
            <div style={{ 
              display: "flex", 
              alignItems: "flex-start", 
              padding: "12px 0",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              padding: "14px"
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
              <span style={{ fontSize: "32px", color: "white" }}>👤</span>
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
                      <span style={{ fontSize: "18px" }}>{platform.icon}</span>
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
import React, { useEffect, useState, useCallback } from "react"
import { ConfigService } from "~services/ConfigService"
import { DEFAULT_CONFIG, type AIProvider, type AppConfig, type AnalysisMode } from "~types"

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI Compatible)" }
]

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  }}>
    <h2 style={{ fontSize: "16px", margin: "0 0 15px 0", color: "#333" }}>{title}</h2>
    {children}
  </div>
);

export default function Options() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

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
    setStatus("Saved!")
    setTimeout(() => setStatus(""), 2000)
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

  if (!config) return <div>Loading...</div>

  const renderModelSelector = () => {
    if (isLoadingModels) {
      return <div style={{ color: "#666", fontSize: "12px" }}>正在加载模型列表...</div>
    }
    
    const hasModels = models.length > 0;
    
    return (
      <>
        {hasModels ? (
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
              style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="">-- 选择模型 --</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
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
              style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
              placeholder="手动输入模型名称 (如 gpt-4o)"
            />
        )}
        
        {modelError && (
            <div style={{ color: "orange", fontSize: "11px", marginTop: "4px" }}>
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

  return (
    <div style={{ 
        padding: "30px", 
        maxWidth: "700px", 
        margin: "0 auto", 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: "#f7f7f7"
    }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>DeepProfile 设置</h1>
      
      <Card title="平台支持">
        <div style={{ display: "flex", gap: "10px" }}>
            <button style={{ flex: 1, padding: "10px", border: "2px solid #0084ff", backgroundColor: "#e3f2fd", color: "#0084ff", fontWeight: "bold", borderRadius: "4px" }}>知乎</button>
            <button style={{ flex: 1, padding: "10px", border: "1px solid #ccc", backgroundColor: "#f5f5f5", color: "#999", cursor: "not-allowed", borderRadius: "4px" }} disabled>Reddit (即将支持)</button>
        </div>
      </Card>

      <Card title="AI 模型配置">
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            AI 服务商
          </label>
          <select
            value={config.selectedProvider}
            onChange={(e) =>
              setConfig({ ...config, selectedProvider: e.target.value as AIProvider })
            }
            style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            API Key
          </label>
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
            style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
            placeholder={`请输入 API Key`}
          />
        </div>

        {showBaseUrlInput && (
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              API Base URL {config.selectedProvider === 'custom' ? '(必填)' : '(可选)'}
            </label>
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
              style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
              placeholder={getBaseUrlPlaceholder(config.selectedProvider)}
            />
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            模型
          </label>
          {renderModelSelector()}
        </div>

        <div>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{
                  padding: "8px 16px",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: isTesting ? "not-allowed" : "pointer",
                  fontSize: "14px"
              }}
            >
              {isTesting ? "测试中..." : "🔌 测试连接"}
            </button>
            
            {testResult && (
                <div style={{ 
                    marginTop: "10px", 
                    padding: "10px", 
                    borderRadius: "4px", 
                    backgroundColor: testResult.success ? "#e8f5e9" : "#ffebee",
                    color: testResult.success ? "#2e7d32" : "#c62828",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap"
                }}>
                    {testResult.success ? "✅ " : "❌ "}{testResult.message}
                </div>
            )}
        </div>
      </Card>

      <Card title="分析策略">
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            分析模式 (速度 vs 深度)
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            {(['fast', 'balanced', 'deep'] as AnalysisMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig({ ...config, analysisMode: mode })}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "4px",
                  border: config.analysisMode === mode ? "2px solid #0084ff" : "1px solid #ccc",
                  backgroundColor: config.analysisMode === mode ? "#e3f2fd" : "white",
                  color: config.analysisMode === mode ? "#0084ff" : "#333",
                  cursor: "pointer",
                  fontWeight: config.analysisMode === mode ? "bold" : "normal"
                }}>
                {mode === 'fast' && '⚡ 极速'}
                {mode === 'balanced' && '⚖️ 平衡'}
                {mode === 'deep' && '🧠 深度'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
            {config.analysisMode === 'fast' && "仅做快速总结，适合概览。"}
            {config.analysisMode === 'balanced' && "标准分析，兼顾速度与质量。"}
            {config.analysisMode === 'deep' && "启用思维链 (CoT)，深入识别反讽、隐喻，耗时较长。"}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            分析最近回答数量: {config.analyzeLimit || 15}
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={config.analyzeLimit || 15}
            onChange={(e) =>
              setConfig({ ...config, analyzeLimit: parseInt(e.target.value) })
            }
            style={{ width: "100%" }}
          />
        </div>
      </Card>

      <Card title="开发者选项">
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            id="enableDebug"
            checked={config.enableDebug || false}
            onChange={(e) =>
              setConfig({ ...config, enableDebug: e.target.checked })
            }
            style={{ marginRight: "10px", width: "18px", height: "18px" }}
          />
          <label htmlFor="enableDebug" style={{ fontWeight: "500", cursor: "pointer" }}>
            开启调试模式
          </label>
        </div>
      </Card>

      <button
        onClick={handleSave}
        style={{
          padding: "12px 24px",
          backgroundColor: "#0084ff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          width: "100%",
          marginTop: "10px"
        }}>
        保存配置
      </button>

      {status && (
        <div style={{ marginTop: "16px", textAlign: "center", color: "green", fontWeight: "bold" }}>
          {status}
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from "react"
import { ConfigService } from "~services/ConfigService"
import { DEFAULT_CONFIG, type AIProvider, type AppConfig } from "~types"

const PROVIDERS: AIProvider[] = ["openai", "gemini", "deepseek", "ollama"]

export default function Options() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    ConfigService.getConfig().then((c) => {
        // Merge with default to ensure new fields exist
        setConfig({ ...DEFAULT_CONFIG, ...c })
    })
  }, [])

  const handleSave = async () => {
    if (!config) return
    await ConfigService.saveConfig(config)
    setStatus("Saved!")
    setTimeout(() => setStatus(""), 2000)
  }

  if (!config) return <div>Loading...</div>

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px" }}>DeepProfile 设置</h1>
      
      {/* Provider Selection */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          选择 AI 服务商:
        </label>
        <select
          value={config.selectedProvider}
          onChange={(e) =>
            setConfig({ ...config, selectedProvider: e.target.value as AIProvider })
          }
          style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          API Key ({config.selectedProvider.toUpperCase()}):
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
          placeholder={`请输入 ${config.selectedProvider} API Key`}
        />
      </div>

      {/* Custom Model Name */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          自定义模型名称 (可选):
        </label>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
          例如: gpt-4o, gemini-1.5-pro, deepseek-chat
        </div>
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
          placeholder="留空则使用默认模型"
        />
      </div>

      {/* Base URL (Ollama/Proxy) */}
      {(config.selectedProvider === "ollama" || config.selectedProvider === "openai" || config.selectedProvider === "deepseek") && (
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            API Base URL (可选):
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
            placeholder={config.selectedProvider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"}
          />
        </div>
      )}

      {/* Analyze Limit */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
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
        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          数量越多分析越准确，但速度越慢且消耗更多 Token。
        </div>
      </div>

      {/* Debug Mode */}
      <div style={{ marginBottom: "30px", display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          id="enableDebug"
          checked={config.enableDebug || false}
          onChange={(e) =>
            setConfig({ ...config, enableDebug: e.target.checked })
          }
          style={{ marginRight: "10px", width: "18px", height: "18px" }}
        />
        <label htmlFor="enableDebug" style={{ fontWeight: "bold", cursor: "pointer" }}>
          开启调试模式 (显示耗时、Token消耗等)
        </label>
      </div>

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
          width: "100%"
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

import React, { useEffect, useState } from "react"
import { ConfigService } from "~services/ConfigService"
import type { AIProvider, AppConfig } from "~types"

const PROVIDERS: AIProvider[] = ["openai", "gemini", "deepseek", "ollama"]

export default function Options() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    ConfigService.getConfig().then(setConfig)
  }, [])

  const handleSave = async () => {
    if (!config) return
    await ConfigService.saveConfig(config)
    setStatus("Saved!")
    setTimeout(() => setStatus(""), 2000)
  }

  if (!config) return <div>Loading...</div>

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>DeepProfile Settings</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Select AI Provider:
        </label>
        <select
          value={config.selectedProvider}
          onChange={(e) =>
            setConfig({ ...config, selectedProvider: e.target.value as AIProvider })
          }
          style={{ padding: "8px", width: "100%" }}>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          API Key for {config.selectedProvider.toUpperCase()}:
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
          style={{ padding: "8px", width: "100%" }}
          placeholder={`Enter ${config.selectedProvider} API Key`}
        />
      </div>

      {config.selectedProvider === "ollama" && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Base URL (default: http://localhost:11434):
          </label>
          <input
            type="text"
            value={config.customBaseUrls["ollama"] || ""}
            onChange={(e) =>
              setConfig({
                ...config,
                customBaseUrls: {
                  ...config.customBaseUrls,
                  ollama: e.target.value
                }
              })
            }
            style={{ padding: "8px", width: "100%" }}
          />
        </div>
      )}

      <button
        onClick={handleSave}
        style={{
          padding: "10px 20px",
          backgroundColor: "#0084ff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
        Save Configuration
      </button>

      {status && <span style={{ marginLeft: "10px", color: "green" }}>{status}</span>}
    </div>
  )
}

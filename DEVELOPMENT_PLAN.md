# DeepProfile Chrome Extension 开发文档

本文档旨在指导 AI 助手一步步完成 DeepProfile Chrome 插件的开发。本项目用于在知乎页面分析用户画像，辅助理性交流。

## 1. 项目概述
*   **项目名称**: DeepProfile
*   **核心功能**: 监听知乎评论区 -> 提取用户 ID -> 抓取用户动态 -> 调用 LLM 分析 -> 展示用户画像。
*   **目标平台**: Chrome 浏览器 (Manifest V3)。

## 2. 技术栈规范
*   **语言**: TypeScript (必须，确保类型安全)。
*   **构建工具**: Vite 或 Plasmo (推荐 Plasmo，因为它对 Chrome 插件开发支持最好)。
*   **UI 框架**: React 或 Preact (轻量级)。
*   **测试框架**: Vitest (单元测试)。
*   **包管理器**: pnpm 或 npm。

## 3. 敏感数据与安全
*   **原则**: 任何 API Key 均不得硬编码在代码中。
*   **存储**: 所有敏感配置（API Key, Base URL）必须存储在 `chrome.storage.local` 中。
*   **版本控制**: `.env` 文件及包含密钥的测试文件必须加入 `.gitignore`。

## 4. 模块化开发路线图

请 AI 开发者按照以下阶段顺序执行，**每个阶段完成后必须通过自动化测试才能进入下一阶段**。

### 阶段一：项目脚手架与配置模块
**目标**: 建立项目结构，实现多模型配置管理。

1.  **初始化项目**:
    *   使用 Plasmo 或 Vite 初始化 TypeScript 项目。
    *   配置 `.gitignore`。
2.  **配置存储服务 (`ConfigService`)**:
    *   定义配置接口 `AppConfig`，包含：
        *   `selectedProvider`: 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'ollama'
        *   `apiKeys`: Record<string, string>
        *   `customBaseUrls`: Record<string, string> (用于 Ollama 或代理)
    *   实现 `saveConfig` 和 `getConfig` 方法。
3.  **设置页面 (Options Page)**:
    *   开发一个简单的设置页，允许用户选择 AI 模型并输入 Key。
4.  **自动化测试**:
    *   **Unit Test**: Mock `chrome.storage.local`，测试 `ConfigService` 的读写逻辑。确保数据能正确保存和读取。

### 阶段二：知乎数据获取模块 (ZhihuClient)
**目标**: 安全地获取并清洗知乎用户数据。

1.  **API 封装**:
    *   实现 `ZhihuClient` 类。
    *   方法 `fetchUserActivities(userId: string): Promise<string[]>`。
    *   使用 `fetch` 调用知乎接口 `https://www.zhihu.com/api/v4/members/{id}/activities`。
    *   **注意**: 此请求需在 Background Script 中发起以利用 Cookie，或者在 Content Script 中处理（需注意 CORS，通常建议 Background）。
2.  **数据清洗**:
    *   实现 `cleanActivityData(json: any): string`。
    *   提取回答/文章的标题和摘要，去除 HTML 标签，合并为纯文本。
    *   截取最近 10-20 条，总长度控制在 LLM 上下文限制内。
3.  **自动化测试**:
    *   **Unit Test**: 提供一段 Mock 的知乎 API JSON 响应，验证 `cleanActivityData` 是否能正确提取出纯文本摘要。

### 阶段三：AI 服务集成 (LLMService)
**目标**: 对接多种大模型接口。

1.  **定义接口**:
    *   `interface LLMProvider { generateProfile(text: string): Promise<string>; }`
2.  **实现适配器**:
    *   `OpenAIProvider`: 调用 `/v1/chat/completions`。
    *   `GeminiProvider`: 调用 Google AI Studio API。
    *   `DeepSeekProvider`: 兼容 OpenAI 格式。
    *   `QwenProvider` (通义千问): 兼容 OpenAI 格式或专用 SDK。
    *   `OllamaProvider`: 调用本地 `http://localhost:11434/api/generate`。
3.  **Prompt 工程**:
    *   设计系统提示词：*“你是一个心理分析师，请根据以下用户的知乎动态，简要总结其领域偏好、性格特征和潜在的言论倾向。请保持客观，字数控制在 100 字以内。”*
4.  **自动化测试**:
    *   **Unit Test**: Mock `fetch` 请求，针对每个 Provider 验证请求体（URL, Headers, Body）格式是否正确。**不要真实发起网络请求**。

### 阶段四：Content Script 与 UI 注入
**目标**: 在知乎页面展示结果。

1.  **DOM 监听**:
    *   使用 `MutationObserver` 监听知乎评论区加载。
    *   识别评论列表中的用户链接，提取 User ID (例如 `people/xxxx`).
2.  **UI 组件**:
    *   在用户头像旁或评论框旁注入一个“🔍 分析”按钮。
    *   点击后显示 Loading 状态。
    *   成功后显示浮窗 (Tooltip) 展示 AI 生成的画像。
3.  **交互逻辑**:
    *   点击按钮 -> 发送消息给 Background -> Background 调用 ZhihuClient & LLMService -> 返回结果 -> Content Script 展示。
4.  **自动化测试**:
    *   **Unit Test (JSDOM)**: 提供一段包含知乎评论 HTML 的字符串，测试 ID 提取正则表达式是否准确。

### 阶段五：集成与优化
**目标**: 提升体验与稳定性。

1.  **缓存层**:
    *   对同一个 User ID 的分析结果缓存 24 小时，避免重复消耗 Token。
2.  **错误处理**:
    *   处理 API 限流、网络超时、Key 无效等情况，在 UI 上给出友好提示。
3.  **自动化测试**:
    *   测试缓存逻辑是否生效。

## 5. 给 AI 的开发指令示例

当你开始开发时，请遵循以下模式：

> "我现在开始开发**阶段一**。首先，我将初始化项目结构并安装必要的依赖。接着，我将创建 `ConfigService.ts` 并编写对应的单元测试 `ConfigService.test.ts`。"

每次提交代码前，必须运行 `npm test` 或 `pnpm test` 确保测试通过。

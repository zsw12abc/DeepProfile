# DeepProfile - 知乎用户画像分析插件

DeepProfile 是一个 Chrome 浏览器插件，利用 AI 技术（OpenAI, Gemini, DeepSeek, Ollama）分析知乎用户的近期动态，生成简短的性格与领域偏好画像，辅助理性交流。

## 🚀 功能特性

*   **多模型支持**：支持 OpenAI (GPT-3.5/4), Google Gemini, DeepSeek, 通义千问, 以及本地 Ollama 模型。
*   **隐私安全**：API Key 仅存储在本地浏览器中，不上传任何服务器。
*   **无感嵌入**：在知乎评论区和用户主页的用户链接旁自动添加分析按钮。
*   **实时分析**：点击按钮即可实时抓取用户最近动态并生成画像。

## 🛠️ 安装与开发

### 前置要求
*   Node.js 18+
*   pnpm 或 npm

### 1. 安装依赖
```bash
npm install
# 如果遇到依赖问题，可以尝试:
# npm install --legacy-peer-deps
```

### 2. 运行测试
本项目包含完整的单元测试，覆盖配置管理、数据清洗和 AI 服务接口。
```bash
npm test
```

### 3. 启动开发服务器
```bash
npm run dev
```
此命令会实时编译插件代码到 `build/chrome-mv3-dev` 目录。

### 4. 加载到 Chrome
1.  打开 Chrome 浏览器，访问 `chrome://extensions/`。
2.  开启右上角的 **"开发者模式" (Developer mode)**。
3.  点击 **"加载已解压的扩展程序" (Load unpacked)**。
4.  选择本项目下的 `build/chrome-mv3-dev` 文件夹。

## 📖 使用指南

### 第一步：配置 API Key
1.  插件加载成功后，在 Chrome 扩展栏找到 DeepProfile 图标。
2.  右键点击图标，选择 **"选项" (Options)**。
3.  在设置页中：
    *   选择你喜欢的 AI 提供商（推荐 **DeepSeek** 或 **OpenAI**）。
    *   填入对应的 API Key。
    *   如果是 Ollama，请确保本地服务已启动 (`ollama serve`)，并配置 Base URL (默认 `http://localhost:11434`)。
4.  点击 **Save Configuration** 保存。

### 第二步：分析用户
1.  打开知乎任意回答或文章页面。
2.  浏览评论区，你会发现用户 ID 链接旁边多了一个小的 **🔍** 图标。
3.  点击该图标。
4.  右下角会弹出一个浮窗，显示正在分析中。
5.  几秒钟后，浮窗将展示该用户的画像分析结果。

## ⚠️ 常见问题

*   **分析失败/报错？**
    *   检查 API Key 是否正确。
    *   检查网络连接（部分 API 需要科学上网）。
    *   如果是 Ollama，请确保允许跨域请求（设置环境变量 `OLLAMA_ORIGINS="*"`）。
*   **找不到🔍图标？**
    *   尝试刷新页面。
    *   知乎页面结构更新频繁，如果选择器失效，请提交 Issue。

## 🤝 贡献
欢迎提交 Pull Request 或 Issue！

---
*Powered by Plasmo Framework*

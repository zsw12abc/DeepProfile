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

// 获取版本信息
const getVersion = (): string => {
  return "0.5.1"; // 从 package.json 获取或硬编码
};

// 完整的更新日志内容
const changelogContent = `# DeepProfile 开发进展与更新日志

## 当前版本: v0.5.1 (Beta)

### ✅ 已达成功能

#### 核心功能 (v0.5.1) - 多语言支持 (i18n)
- [x] **国际化架构**: 引入轻量级 I18nService，支持动态切换语言。
- [x] **双语界面**: 全面支持 **简体中文 (zh-CN)** 和 **English (en-US)**。
    - 设置页面 (Options Page)
    - 悬浮分析卡片 (Profile Card)
    - 错误提示与状态反馈
- [x] **双语 AI 分析**: 
    - 优化 Prompt 工程，根据用户选择的语言，强制 AI 输出对应语言的分析结果。
    - 标签系统 (Label System) 支持双语显示（如 "左派 vs 右派" / "Left vs Right"）。
- [x] **动态切换**: 在设置页面切换语言后，界面即时更新，无需重启插件。

#### 核心功能 (v0.5.0) - 评论区舆情总结
- [x] **舆情概览**: 在知乎评论区顶部新增"📊 总结本页观点"按钮，一键生成当前页面的舆论画像。
- [x] **零风险分析**: 仅分析当前页面已加载的评论文本，**不调用知乎 API**，彻底规避风控封号风险。
- [x] **立场分布**: 自动统计支持方、反对方和中立吃瓜群众的比例，并以可视化进度条展示。
- [x] **核心观点提取**: 智能归纳评论区反复出现的 3-5 个核心论点，并附带典型评论摘录。
- [x] **情绪检测**: 自动判断评论区氛围（积极/消极/争议巨大）。

#### 核心功能 (v0.4.2) - 导出功能增强与体验优化
- [x] **图片导出升级**:
    - **个性化头像**: 导出的画像卡片现在会显示用户的**知乎头像**，而非插件默认 LOGO。
    - **二维码分享**: 卡片底部新增指向 Chrome 商店的二维码，方便分享传播。
    - **技术突破**: 解决了 html2canvas 跨域图片渲染问题，确保头像稳定显示。
- [x] **历史记录增强**:
    - **全功能导出**: 在后台历史记录管理中，为每条记录增加了"📸 导出为图片"按钮。
    - **显示修复**: 修复了历史记录列表中用户昵称显示为 ID 的问题，现在优先显示用户昵称。
- [x] **错误提示优化**:
    - **人话翻译**: 将枯燥的 HTTP 错误码（401, 402, 429 等）替换为俏皮、易懂的中文提示（如"钱包空空如也"、"芝麻开门失败"）。
    - **403 引导**: 针对知乎 API 的 403 错误，增加了引导用户刷新页面或登录的友好提示。
- [x] **UI 细节**:
    - 在分析结果悬浮卡片（Overlay）的头部增加了用户头像显示。

#### 核心功能 (v0.4.1) - 性能优化与 Prompt 精简
- [x] **Prompt 动态剪裁**: 
    - **按需加载**: 根据当前话题分类（如"科技"），仅向 LLM 发送该分类下的相关标签定义，而非全量发送所有标签。
    - **Token 节省**: 系统 Prompt 长度减少约 60%，显著降低 Token 消耗并提升响应速度。
    - **专注度提升**: 减少无关标签干扰，使 LLM 更专注于当前领域的分析。
- [x] **标签系统优化**:
    - 重构 LabelService，支持按分类获取标签定义。
    - 优化 TopicService，提升关键词匹配的准确性。

#### 核心功能 (v0.4.0) - 历史记录与缓存系统
- [x] **本地缓存机制**: 
    - 自动将分析生成的用户画像存储在本地 (chrome.storage.local)。
    - 采用 **"用户聚合 + 领域分层"** 的存储结构，同一用户在不同领域（如政治、娱乐）的画像互不干扰。
    - 默认缓存有效期为 24 小时，过期自动失效。
- [x] **智能缓存命中**: 
    - **秒级响应**: 再次访问已分析用户时，直接从缓存加载结果，无需等待 API 请求。
    - **零 Token 消耗**: 命中缓存时不调用 LLM 接口，节省成本。
    - **领域自适应**: 自动识别当前话题领域，优先加载该领域的历史画像。
- [x] **历史记录管理**:
    - 在设置页面新增"历史记录"面板。
    - 支持查看所有已分析的用户列表（按时间排序）。
    - 支持展开查看每个用户的详细领域画像（政治、经济、娱乐等）。
    - 支持精细化删除（单条画像、单个用户）或一键清空。
- [x] **强制刷新**:
    - 在分析结果卡片上增加"重新分析"按钮，允许用户忽略缓存强制更新。

#### 核心功能 (v0.3.0)
- [x] **多平台架构**: 预留 Reddit 等多平台支持的扩展接口。
- [x] **多模型支持**:
    - 新增 **通义千问 (Qwen)** 和 **Custom (OpenAI 兼容)** 服务商。
    - 支持**动态加载模型列表**，避免手动输入错误。
- [x] **知乎数据抓取**: 
    - 自动解析用户 Hash ID 为 URL Token。
    - **混合数据源**: 并行抓取用户的**原创内容 (回答/文章)** 与 **赞同动态**。
    - 支持抓取数量配置 (10-50条)。
- [x] **上下文感知 (Context-Aware)**:
    - **精准提取**: 自动提取当前页面的问题标题和**知乎官方话题标签**。
    - **智能分类**: 引入 **TopicService**，将话题自动归类为"政治"、"经济"、"科技"等八大宏观领域。
    - **混合分类策略**: 优先使用关键词匹配，匹配失败时自动降级调用 LLM 进行智能分类。
- [x] **深度画像生成**:
    - **内容为王**: 优先提取并分析**回答/文章正文**，而非简短摘要。
    - **规避风控**: 将"政治倾向"降敏为"**价值取向**"，从"经济"、"文化"、"国际观"等多维度进行中性分析。
    - **矛盾点分析**: 要求 LLM 在总结中解释用户观点中的矛盾之处。
    - **证据引用**: 提供可点击的原文引用链接，支持跳转到具体回答/文章。

#### 用户体验 (UI/UX)
- [x] **无感注入**: 仅在用户昵称右侧显示 "🔍" 图标，自动过滤头像和重复链接。
- [x] **实时反馈**: 
    - 点击即显示用户昵称。
    - 详细的进度提示 (获取信息 -> 抓取动态 -> AI 分析)。
- [x] **结果展示**:
    - **多维价值图谱**: 使用进度条展示不同维度上的价值取向。
    - 折叠式证据栏，保持界面整洁。
- [x] **连接测试**: 在设置页提供"测试连接"功能，并返回**友好的中文错误提示** (如余额不足、Key无效)。

#### 高级设置
- [x] **自定义配置**:
    - **模型下拉选择**: 自动获取并展示可用模型列表。
    - 自定义 API Base URL (支持代理)。
- [x] **分析模式**:
    - **⚡ 极速**: 快速概览。
    - **⚖️ 平衡**: 标准分析。
    - **🧠 深度**: 启用思维链 (CoT)，深度识别反讽、隐喻。
- [x] **开发者调试 (Debug Mode)**:
    - **透明化**: 新增 Source 字段，清晰展示"抓取了多少 -> 找到了多少相关 -> 最终分析了多少"。
    - **数据溯源**: 新增 Breakdown 字段，展示原创内容 vs 赞同内容的比例。

---

## 版本历史

### v0.5.1 (2024-01-10) - 多语言支持
*   **Major Feature**: 全面支持 **简体中文** 和 **English** 双语切换。
*   **Feature**: AI 分析结果自动适配所选语言。
*   **Refactor**: 引入 I18nService 统一管理文本资源。

### v0.5.0 (2024-01-09) - 评论区舆情总结
*   **Major Feature**: **评论区舆情总结**，一键生成当前页面的舆论画像，包括立场分布、核心观点和情绪检测。
*   **Security**: 采用**零风险分析**策略，仅分析已加载的 DOM 文本，不调用知乎 API，彻底规避风控。

### v0.4.2 (2024-01-08) - 导出增强与体验优化
*   **Feature**: 导出图片支持显示用户头像和二维码。
*   **Feature**: 历史记录管理支持图片导出。
*   **Fix**: 修复历史记录中用户昵称显示问题。
*   **Fix**: 优化知乎 API 请求头，解决 403 问题。
*   **UX**: 错误提示文案优化，更加友好俏皮。

### v0.4.1 (2024-01-07) - 性能优化
*   **Optimization**: **Prompt 动态剪裁**，根据话题分类仅加载相关标签定义，大幅减少 Token 消耗并提升响应速度。
*   **Refactor**: 优化标签服务与话题服务，提升代码可维护性。

### v0.4.0 (2024-01-06) - 历史记录与智能分类
*   **Major Feature**: **历史记录系统**，支持本地缓存、秒级响应和可视化管理。
*   **Major Feature**: **八大维度全谱系分类**，引入政治、经济、社会、科技等 30+ 个细分维度，画像更立体。
*   **Feature**: **混合分类策略**，结合关键词匹配与 LLM 智能分类，确保话题归类准确无误。
*   **Feature**: **领域自适应分析**，LLM 自动判断内容相关性，避免"张冠李戴"的错误分析。
*   **Optimization**: **Prompt 深度降敏**，大幅降低触发内容安全风控的概率。
*   **UI**: 设置页面新增"历史记录"面板，支持展开查看和精细化管理。

### v0.3.0 (2024-01-04) - 精准聚焦与体验优化
*   **Major Feature**: **重构上下文感知算法**，使用话题标签进行精准匹配，并采用动态截断策略，彻底解决话题跑偏问题。
*   **Major Feature**: **重构 Prompt**，使用"价值取向"代替"政治倾向"，规避国产模型风控，并要求 AI 解释矛盾点。
*   **Feature**: **新增"连接测试"功能**，提供友好的中文错误提示。
*   **Feature**: **动态加载模型列表**，将模型名称输入框升级为下拉选择框。
*   **Feature**: 新增对**通义千问 (Qwen)** 和**自定义 OpenAI 兼容接口**的支持。
*   **Feature**: 数据源增加**用户点赞动态**，并能在 Debug 面板中展示来源比例。
*   **Fix**: 优先提取并分析回答/文章的**完整正文**，而非简短摘要。
*   **UI**: 设置页面 UI 现代化，采用卡片式布局。

### v0.2.0 (2024-01-03) - 深度分析与上下文感知
*   **Feature**: 新增上下文感知功能，根据当前浏览的问题自动筛选用户相关回答。
*   **Feature**: 新增"分析模式"设置 (极速/平衡/深度)，深度模式支持识别反讽。
*   **Feature**: 画像标签新增置信度概率展示。
*   **Feature**: Debug 模式增强，显示话题分类和抓取策略。
*   **Fix**: 优化注入逻辑，精准定位昵称右侧，排除头像干扰。
*   **Fix**: 修复引用链接为 API 格式的问题，统一为网页链接。

### v0.1.0 (2024-01-02) - MVP 发布
*   **Feature**: 完成基础架构 (Plasmo + React + TypeScript)。
*   **Feature**: 实现知乎 API 抓取与清洗。
*   **Feature**: 对接 OpenAI/Gemini/Ollama 接口。
*   **Feature**: 实现基础 UI 注入与画像展示卡片。
*   **Feature**: 支持 API Key 配置。

---

## 📅 待办计划 (Roadmap)

- [ ] **更多平台**: 探索支持 Reddit、Bilibili、微博等其他平台。
`;

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI Compatible)" }
]

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" }
]

const ZhihuIcon = <img src="https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.a53ae37b.png" alt="Zhihu" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "contain" }} />;
const RedditIcon = <img src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-120x120.png" alt="Reddit" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "contain" }} />;

type PlatformId = 'general' | 'zhihu' | 'reddit' | 'debug' | 'history' | 'version';

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
    await ConfigService.saveConfig(config)
    I18nService.setLanguage(config.language);
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
      }}>⏳ {I18nService.t('loading')}</div>
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
                <option value="">-- {I18nService.t('model_select')} --</option>
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
                ⚠️ {modelError}
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
          <Card title={I18nService.t('settings_general')} icon={<span style={{ fontSize: "24px" }}>🤖</span>}>
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
                    {config.globalEnabled ? I18nService.t('plugin_enabled') : I18nService.t('plugin_disabled')}
                </label>
                <div style={{ fontSize: "13px", color: config.globalEnabled ? "#2f855a" : "#9b2c2c", marginTop: "4px" }}>
                  {config.globalEnabled ? I18nService.t('plugin_enabled_desc') : I18nService.t('plugin_disabled_desc')}
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

            <InputGroup label="Language / 语言">
              <div style={{ position: "relative" }}>
                  <select
                      value={config.language}
                      onChange={(e) => {
                        const newLang = e.target.value as Language;
                        setConfig({ ...config, language: newLang });
                        I18nService.setLanguage(newLang);
                        forceUpdate();
                      }}
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
                      {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                          {l.label}
                      </option>
                      ))}
                  </select>
              </div>
            </InputGroup>

            <InputGroup label={I18nService.t('ai_provider')}>
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

            <InputGroup label={I18nService.t('api_key')}>
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
              <InputGroup label={`${I18nService.t('api_base_url')} ${config.selectedProvider === 'custom' ? '(Required)' : '(Optional)'}`}>
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

            <InputGroup label={I18nService.t('model_select')}>
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
                  {isTesting ? "⏳ Testing..." : I18nService.t('test_connection')}
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
                          {testResult.success ? I18nService.t('connection_success') : I18nService.t('connection_failed')}
                        </strong>
                        {testResult.message}
                    </div>
                )}
            </div>
          </Card>
        );
      case 'zhihu':
        return (
          <Card title={I18nService.t('settings_zhihu')} icon={ZhihuIcon}>
            <InputGroup 
              label={I18nService.t('analysis_mode')} 
              subLabel={
                  config.analysisMode === 'fast' ? I18nService.t('mode_fast_desc') :
                  config.analysisMode === 'balanced' ? I18nService.t('mode_balanced_desc') :
                  I18nService.t('mode_deep_desc')
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
                      {mode === 'fast' && I18nService.t('mode_fast')}
                      {mode === 'balanced' && I18nService.t('mode_balanced')}
                      {mode === 'deep' && I18nService.t('mode_deep')}
                  </button>
                  ))}
              </div>
            </InputGroup>

            <InputGroup label={`${I18nService.t('analyze_limit')}: ${config.analyzeLimit || 15}`}>
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
          <Card title={I18nService.t('settings_reddit')} icon={RedditIcon}>
              <div style={{ 
                  padding: "24px", 
                  backgroundColor: "#f8fafc", 
                  borderRadius: "10px", 
                  color: "#a0aec0", 
                  fontSize: "15px",
                  textAlign: "center",
                  border: "1px dashed #e2e8f0"
              }}>
                  🚧 Reddit platform support is under development...
              </div>
          </Card>
        );
      case 'history':
        return (
          <Card title={I18nService.t('settings_history')} icon={<span style={{ fontSize: "24px" }}>📅</span>}>
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Total {historyRecords.length} users (Max {200})
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
                  {I18nService.t('clear_all')}
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#a0aec0" }}>
                {I18nService.t('loading')}
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
                {I18nService.t('history_empty')}
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
                        title={I18nService.t('delete')}
                      >
                        ×
                      </button>
                    </summary>
                    <div style={{ marginTop: "16px", borderTop: "1px solid #f0f0f0", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Object.values(userRecord.profiles).map(profile => {
                        const date = new Date(profile.timestamp);
                        const timeStr = date.toLocaleString(config?.language === 'en-US' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
                                  title={I18nService.t('export_markdown')}
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
                                  title={I18nService.t('export_image')}
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
                                  title={I18nService.t('delete')}
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
          <Card title={I18nService.t('settings_debug')} icon={<span style={{ fontSize: "24px" }}>🛠️</span>}>
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
                    {I18nService.t('debug_mode')}
                </label>
                <div style={{ fontSize: "13px", color: "#718096", marginTop: "6px" }}>
                  {I18nService.t('debug_mode_desc')}
                </div>
              </div>
            </div>
          </Card>
        );
      case 'version':
        return (
          <Card title={I18nService.t('version_info')} icon={<span style={{ fontSize: "24px" }}>ℹ️</span>}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#2d3748", marginBottom: "8px" }}>
                {I18nService.t('current_version')}: 
                <span style={{ color: "#3498db", marginLeft: "8px" }}>{`v${getVersion()}`}</span>
              </div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#2d3748" }}>
                {I18nService.t('changelog')}
              </h4>
              <div style={{ 
                maxHeight: "400px", 
                overflowY: "auto", 
                padding: "16px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "8px", 
                border: "1px solid #e2e8f0",
                lineHeight: "1.6"
              }}>
                <MarkdownRenderer content={changelogContent} />
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#2d3748" }}>
                {I18nService.t('version_history')}
              </h4>
              <div style={{ 
                maxHeight: "300px", 
                overflowY: "auto", 
                padding: "16px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "8px", 
                border: "1px solid #e2e8f0",
                lineHeight: "1.6"
              }}>
                <MarkdownRenderer content={changelogContent} />
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

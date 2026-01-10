import type { LocaleDict } from "./index";

export const zhCN: LocaleDict = {
  // General
  app_name: "DeepProfile",
  app_description: "AI 驱动的用户画像分析工具",
  loading: "加载中...",
  save: "设置已保存",
  saved: "已保存!",
  cancel: "取消",
  delete: "删除",
  confirm_delete: "确定要删除吗？",
  clear_all: "清空全部",
  confirm_clear_all: "确定要清空所有历史记录吗？此操作不可恢复。",
  export_markdown: "导出为 Markdown",
  export_image: "导出为图片",
  export_image_failed: "图片导出失败",
  settings: "设置菜单",

  // Options Page
  settings_general: "通用设置",
  settings_zhihu: "知乎设置",
  settings_reddit: "Reddit 设置",
  debug_mode: "调试模式",
  debug_mode_desc: "启用详细日志记录",
  settings_history: "历史记录",
  settings_debug: "开发者选项",
  plugin_enabled: "✅ 插件已启用",
  plugin_disabled: "⛔ 插件已禁用",
  plugin_enabled_desc: "DeepProfile 正在正常工作，将在目标网站显示分析按钮。",
  plugin_disabled_desc: "DeepProfile 已完全关闭，不会在任何网站注入代码。",
  ai_provider: "AI 服务商",
  api_key: "API Key",
  api_base_url: "API Base URL",
  model_select: "模型选择",
  test_connection: "🔌 测试连接",
  connection_success: "✅ 连接成功",
  connection_failed: "❌ 连接失败",
  analysis_mode: "分析模式",
  analyze_limit: "分析回答数量",
  mode_fast: "⚡ 极速",
  mode_fast_desc: "最少内容，最快分析",
  mode_balanced: "⚖️ 平衡",
  mode_balanced_desc: "适中内容，平衡速度与质量",
  mode_deep: "🧠 深度",
  mode_deep_desc: "最多内容，最全面分析",
  
  // Categories
  category_politics: "🏛️ 政治 (Politics)",
  category_economy: "💰 经济 (Economy)",
  category_society: "👥 社会 (Society)",
  category_technology: "💻 科技 (Technology)",
  category_culture: "🎨 文化 (Culture)",
  category_environment: "🌍 环境 (Environment)",
  category_entertainment: "🎮 娱乐 (Entertainment)",
  category_lifestyle_career: "💼 生活与职场 (Lifestyle & Career)",
  category_general: "🌐 通用综合",
  
  // Profile Card
  analyzing: "正在分析",
  topic_classification: "话题分类",
  value_orientation: "价值取向",
  ai_summary: "AI 总结",
  evidence: "证据",
  source: "来源",
  expand: "展开",
  collapse: "收起",
  reanalyze: "重新分析",
  wait_moment: "请稍等片刻...",
  history_record: "历史记录",
  history_empty: "暂无历史记录",
  total_users_max: "总计 {count} 用户 (最大 {max})",
  debug_info: "调试信息",
  token_usage: "模型",
  total_duration: "总耗时",
  llm_duration: "AI 耗时",
  data_items: "数据项",
  data_breakdown: "数据分解",
  unknown_user: "未知用户",
  unknown_topic: "未知话题",
  
  // Errors
  error_401: "认证失败 (401) 🔐: 请检查您的 API Key 是否正确。",
  error_402: "余额不足 (402) 💸: 请检查您的 API Key 余额。",
  error_404: "迷路了 (404) 🗺️，找不到这个模型，请检查配置。",
  error_429: "太热情啦 (429) 🔥，AI 有点忙不过来，请稍后再试。",
  error_500: "AI 服务商罢工了 (500) 💥，请稍后再试。",
  error_network: "网络开小差了 🌐，请检查网络连接或代理设置。",
  error_zhihu_403: "哎呀，被知乎拦截了 (403) 🚧。请试着刷新一下知乎页面，或者确认是否登录了哦～",
  error_user_not_found: "哎呀，找不到这个用户的数据 🕵️‍♂️，可能是账号被封禁或设置了隐私保护。",

  // Export
  click_jump: "点击跳转",
  no_data: "暂无数据",
  generated_by: "由",
  scan_to_install: "扫码安装",
  start_ai_journey: "开启AI之旅",
  ai_profile_analysis: "AI驱动的用户画像分析",
  date_label: "日期",
  
  // Comment Analysis
  analyzing_comments: "正在分析当前页面的评论...",
  expanding_comments: "正在展开评论区...",
  extracting_comments: "正在提取评论数据...",
  ai_reading: "AI 正在阅读大家的观点...",
  comment_analysis_failed: "分析失败",

  // Theme Settings
  theme_settings: "主题设置",
  select_theme: "选择主题",
  create_custom_theme: "创建自定义主题",
  theme_id: "主题ID",
  theme_name: "主题名称",
  theme_description: "主题描述",
  unique_theme_identifier: "唯一的主题标识符",
  display_name_for_theme: "主题的显示名称",
  optional_description: "可选的描述信息",
  create_theme: "创建主题",
  theme_created: "主题已创建！",
  theme_updated: "主题已更新！",
  theme_deleted: "主题已删除！",
  theme_applied: "主题已应用！",
  theme_zhihu_white_name: "知乎白主题",
  theme_zhihu_white_desc: "知乎风格的浅色主题，蓝色点缀",
  theme_zhihu_black_name: "知乎黑主题",
  theme_zhihu_black_desc: "知乎风格的深色主题，蓝色点缀",
  theme_reddit_white_name: "Reddit白主题",
  theme_reddit_white_desc: "Reddit风格的浅色主题，橙蓝点缀",
  theme_reddit_black_name: "Reddit黑主题",
  theme_reddit_black_desc: "Reddit风格的深色主题，橙蓝点缀",
  failed_load_themes: "加载主题失败",
  failed_apply_theme: "应用主题失败",
  failed_create_theme: "创建主题失败",
  failed_delete_theme: "删除主题失败",
  failed_save_theme: "保存主题失败",
  theme_id_name_required: "请输入主题ID和名称",
  cannot_delete_builtin_theme: "无法删除内置主题",
  confirm_delete_theme: "确定要删除这个主题吗？此操作不可恢复。",
  edit: "编辑",
  color_settings: "颜色设置",
  color_primary: "主色调",
  color_secondary: "次要色调",
  color_background: "背景色",
  color_surface: "表面色",
  color_text: "文字色",
  color_textSecondary: "次要文字色",
  color_border: "边框色",
  color_success: "成功色",
  color_warning: "警告色",
  color_error: "错误色",
  color_accent: "强调色",
  save_changes: "保存更改",
  
  // Context Invalidated Error
  extension_context_invalidated: "扩展上下文失效",
  extension_context_invalidated_title: "扩展上下文失效",
  extension_context_invalidated_desc: "扩展上下文已失效，请刷新页面重试。",
  
  // Version Info
  version_info: "版本信息",
  current_version: "当前版本",
  changelog: "更新日志",
  version_history: "版本历史",
  
  // Comment Analysis
  comment_summary_btn: "分析评论",
  anonymous_user: "匿名用户",
  not_enough_comments: "评论数量不足以进行分析",
  comment_analysis_instruction: "，请尝试增加显示的评论数量。",
  comment_analysis_summary: "评论分析总结",
  comment_analysis_ai_generated: "AI 生成",
  sentiment_support: "支持",
  sentiment_neutral: "中立",
  sentiment_oppose: "反对",
  expand_key_points: "展开要点",
  collapse_key_points: "收起要点",
  deep_insight: "深度洞察",
  logic_fallacy: "检测到逻辑谬误",
  unknown_type: "未知类型",
  example_quote: "示例引用",
  
  // Reddit Overlay
  deep_profile_analysis: "深度画像分析"
};

// DeepProfile 开发进展与更新日志
export const zhCNChangelog = `# DeepProfile 开发进展与更新日志

## 当前版本: v0.6.2 (Beta)

### ✅ 已达成功能

### 核心功能 (v0.6.2) - 主题系统
- ✅ **主题定制**: 支持用户自定义外观主题，包括颜色方案、字体、尺寸等。
- ✅ **多套内置主题**: 提供多套预设主题，包括知乎白/黑主题、Reddit白/黑主题。
- ✅ **动态主题切换**: 支持实时切换主题，无需刷新页面。
- ✅ **CSS变量驱动**: 使用CSS变量实现全局主题动态应用，确保所有组件同步更新。
- ✅ **主题管理**: 支持创建、编辑、删除自定义主题，并提供主题导入导出功能。

### 核心功能 (v0.6.1) - 实时保存设置
- ✅ **实时保存**: 所有设置更改（语言、API密钥、分析模式等）都会**立即自动保存**，无需点击保存按钮。
- ✅ **即时生效**: 配置更改后立即应用到扩展功能中，无需重启或刷新。
- ✅ **用户体验优化**: 移除手动保存按钮，简化设置流程，提供更流畅的用户体验。

### 核心功能 (v0.5.1) - 多语言支持 (i18n)
- ✅ **国际化架构**: 引入轻量级 \`I18nService\`，支持动态切换语言。
- ✅ **双语界面**: 全面支持 **简体中文 (zh-CN)** 和 **English (en-US)**。
    - 设置页面 (Options Page)
    - 悬浮分析卡片 (Profile Card)
    - 错误提示与状态反馈
- ✅ **双语 AI 分析**: 
    - 优化 Prompt 工程，根据用户选择的语言，强制 AI 输出对应语言的分析结果。
    - 标签系统 (Label System) 支持双语显示（如 "左派 vs 右派" / "Left vs Right"）。
- ✅ **动态切换**: 在设置页面切换语言后，界面即时更新，无需重启插件。

### 核心功能 (v0.5.0) - 评论区舆情总结
- ✅ **舆情概览**: 在知乎评论区顶部新增"📊 总结本页观点"按钮，一键生成当前页面的舆论画像。
- ✅ **零风险分析**: 仅分析当前页面已加载的评论文本，**不调用知乎 API**，彻底规避风控封号风险。
- ✅ **立场分布**: 自动统计支持方、反对方和中立吃瓜群众的比例，并以可视化进度条展示。
- ✅ **核心观点提取**: 智能归纳评论区反复出现的 3-5 个核心论点，并附带典型评论摘录。
- ✅ **情绪检测**: 自动判断评论区氛围（积极/消极/争议巨大）。

### 核心功能 (v0.4.2) - 导出功能增强与体验优化
- ✅ **图片导出升级**:
    - **个性化头像**: 导出的画像卡片现在会显示用户的**知乎头像**，而非插件默认 LOGO。
    - **二维码分享**: 卡片底部新增指向 Chrome 商店的二维码，方便分享传播。
    - **技术突破**: 解决了 \`html2canvas\` 跨域图片渲染问题，确保头像稳定显示。
- ✅ **历史记录增强**:
    - **全功能导出**: 在后台历史记录管理中，为每条记录增加了"📸 导出为图片"按钮。
    - **显示修复**: 修复了历史记录列表中用户昵称显示为 ID 的问题，现在优先显示用户昵称。
- ✅ **错误提示优化**:
    - **人话翻译**: 将枯燥的 HTTP 错误码（401, 402, 429 等）替换为俏皮、易懂的中文提示（如"钱包空空如也"、"芝麻开门失败"）。
    - **403 引导**: 针对知乎 API 的 403 错误，增加了引导用户刷新页面或登录的友好提示。
- ✅ **UI 细节**:
    - 在分析结果悬浮卡片（Overlay）的头部增加了用户头像显示。

### 核心功能 (v0.4.1) - 性能优化与 Prompt 精简
- ✅ **Prompt 动态剪裁**: 
    - **按需加载**: 根据当前话题分类（如"科技"），仅向 LLM 发送该分类下的相关标签定义，而非全量发送所有标签。
    - **Token 节省**: 系统 Prompt 长度减少约 60%，显著降低 Token 消耗并提升响应速度。
    - **专注度提升**: 减少无关标签干扰，使 LLM 更专注于当前领域的分析。
- ✅ **标签系统优化**:
    - 重构 \`LabelService\`，支持按分类获取标签定义。
    - 优化 \`TopicService\`，提升关键词匹配的准确性。

### 核心功能 (v0.4.0) - 历史记录与缓存系统
- ✅ **本地缓存机制**: 
    - 自动将分析生成的用户画像存储在本地 (\`chrome.storage.local\`)。
    - 采用 **"用户聚合 + 领域分层"** 的存储结构，同一用户在不同领域（如政治、娱乐）的画像互不干扰。
    - 默认缓存有效期为 24 小时，过期自动失效。
- ✅ **智能缓存命中**: 
    - **秒级响应**: 再次访问已分析用户时，直接从缓存加载结果，无需等待 API 请求。
    - **零 Token 消耗**: 命中缓存时不调用 LLM 接口，节省成本。
    - **领域自适应**: 自动识别当前话题领域，优先加载该领域的历史画像。
- ✅ **历史记录管理**:
    - 在设置页面新增"历史记录"面板。
    - 支持查看所有已分析的用户列表（按时间排序）。
    - 支持展开查看每个用户的详细领域画像（政治、经济、娱乐等）。
    - 支持精细化删除（单条画像、单个用户）或一键清空。
- ✅ **强制刷新**:
    - 在分析结果卡片上增加"重新分析"按钮，允许用户忽略缓存强制更新。

### 核心功能 (v0.3.0)
- ✅ **多平台架构**: 预留 Reddit 等多平台支持的扩展接口。
- ✅ **多模型支持**:
    - 新增 **通义千问 (Qwen)** 和 **Custom (OpenAI 兼容)** 服务商。
    - 支持**动态加载模型列表**，避免手动输入错误。
- ✅ **知乎数据抓取**: 
    - 自动解析用户 Hash ID 为 URL Token。
    - **混合数据源**: 并行抓取用户的**原创内容 (回答/文章)** 与 **赞同动态**。
    - 支持抓取数量配置 (10-50条)。
- ✅ **上下文感知 (Context-Aware)**:
    - **精准提取**: 自动提取当前页面的问题标题和**知乎官方话题标签**。
    - **智能分类**: 引入 **TopicService**，将话题自动归类为"政治"、"经济"、"科技"等八大宏观领域。
    - **混合分类策略**: 优先使用关键词匹配，匹配失败时自动降级调用 LLM 进行智能分类。
- ✅ **深度画像生成**:
    - **内容为王**: 优先提取并分析**回答/文章正文**，而非简短摘要。
    - **规避风控**: 将"政治倾向"降敏为"**价值取向**"，从"经济"、"文化"、"国际观"等多维度进行中性分析。
    - **矛盾点分析**: 要求 LLM 在总结中解释用户观点中的矛盾之处。
    - **证据引用**: 提供可点击的原文引用链接，支持跳转到具体回答/文章。

### 用户体验 (UI/UX)
- ✅ **无感注入**: 仅在用户昵称右侧显示 "🔍" 图标，自动过滤头像和重复链接。
- ✅ **实时反馈**: 
    - 点击即显示用户昵称。
    - 详细的进度提示 (获取信息 -> 抓取动态 -> AI 分析)。
- ✅ **结果展示**:
    - **多维价值图谱**: 使用进度条展示不同维度上的价值取向。
    - 折叠式证据栏，保持界面整洁。
- ✅ **连接测试**: 在设置页提供"测试连接"功能，并返回**友好的中文错误提示** (如余额不足、Key无效)。

### 高级设置
- ✅ **自定义配置**:
    - **模型下拉选择**: 自动获取并展示可用模型列表。
    - 自定义 API Base URL (支持代理)。
- ✅ **分析模式**:
    - **⚡ 极速**: 快速概览。
    - **⚖️ 平衡**: 标准分析。
    - **🧠 深度**: 启用思维链 (CoT)，深度识别反讽、隐喻。
- ✅ **开发者调试 (Debug Mode)**:
    - **透明化**: 新增 \`Source\` 字段，清晰展示"抓取了多少 -> 找到了多少相关 -> 最终分析了多少"。
    - **数据溯源**: 新增 \`Breakdown\` 字段，展示原创内容 vs 赞同内容的比例。

---

## 版本历史

### v0.6.1 (2024-01-09) - 实时保存设置
*   **Feature**: 实现了设置页面的**实时保存功能**，所有配置更改立即自动保存到存储。
*   **Feature**: 移除了手动保存按钮，简化设置界面。
*   **Feature**: 配置更改后立即生效，无需重启或刷新。
*   **UX**: 提升用户体验，提供更流畅的设置流程。

### v0.6.0 (2024-01-08) - Reddit 平台多语言支持增强
*   **Feature**: 修复 Reddit 平台的 I18nService 初始化问题，确保多语言功能正常工作。
*   **Feature**: 重构 Reddit 平台的按钮注入逻辑，使其与 Zhihu 平台保持一致，解决按钮消失的问题。
*   **Feature**: 确保 Reddit 平台的分析按钮和用户画像卡片支持中英文界面切换。
*   **Feature**: 实现了与 Zhihu 平台一致的按钮注入机制，包括配置检查、清理函数和孤儿按钮清理等功能。
*   **Feature**: 更新了加载、分析和错误状态消息的国际化支持，确保界面完全遵循用户语言设置。
*   **Feature**: 修复了 Reddit overlay 中的 useCallback 导入问题，优化了组件性能。

### v0.5.1 (2024-01-10) - 多语言支持
*   **Major Feature**: 全面支持 **简体中文** 和 **English** 双语切换。
*   **Feature**: AI 分析结果自动适配所选语言。
*   **Refactor**: 引入 \`I18nService\` 统一管理文本资源。

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

- ✅ **v0.6.2 主题功能**: 实现 overlay 样式可定制化，允许用户自定义外观主题，包括颜色方案、字体、尺寸等。（已完成）
- ⬜ **更多平台**: 探索支持 Reddit、Bilibili、微博等其他平台。
`;
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
  settings_twitter: "Twitter 设置",
  settings_quora: "Quora 设置",
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
  error_extension_context: "扩展上下文已失效，请刷新页面重试。",

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
  deep_profile_analysis: "深度画像分析",

  // Progress Messages
  reading_user_profile: "正在读取用户资料",
  reading_content: "正在读取用户内容",
  ai_analyzing: "AI 正在分析中"
};

// DeepProfile 当前版本更新日志
export const zhCNChangelog = `# DeepProfile 当前版本更新日志

## 当前版本: v0.8.0 (Beta)

### ✅ 已达成功能

### 核心功能 (v0.8.0) - Twitter与Quora平台支持
- ✅ **Twitter平台支持**: 添加了对Twitter(X)平台的用户画像分析支持，包括内容抓取和分析功能。
- ✅ **Quora平台支持**: 添加了对Quora平台的用户画像分析支持，包括内容抓取和分析功能。
- ✅ **多平台架构**: 扩展了底层架构以支持多平台，便于未来添加更多社交平台。
- ✅ **界面集成**: 在选项页面中添加了Twitter和Quora的设置入口，以及相应的图标。
- ✅ **权限配置**: 更新了manifest文件以包含Twitter和Quora的访问权限。

`;

// DeepProfile 版本历史记录
export const zhCNVersionHistory = `# DeepProfile 版本历史

### 核心功能 (v0.7.1) - 标签显示与LLM输出优化
- ✅ **标签显示修复**: 解决了部分标签（如 \`competition_vs_equality\`, \`speculation_vs_value\` 等）在前端无法正确显示的问题。
- ✅ **标签定义同步**: 确保了 \`LabelService\` 中的标签定义与 \`LabelDefinitions\` 完全一致，消除了 ID 不匹配导致的显示错误。
- ✅ **LLM 输出标准化**: 增加了对 LLM 返回标签 ID 的自动标准化处理，能够自动纠正 AI 返回的非标准标签 ID（例如将 \`nationalism_globalism\` 自动映射为 \`geopolitics\`）。
- ✅ **重复标签处理**: 优化了结果解析逻辑，自动合并和去重 LLM 返回的重复标签，优先保留置信度更高的评分。

### 核心功能 (v0.7.0) - 提升画像分析准确度与一致性
- ✅ **AI摘要一致性**: 确保AI生成的摘要与数值标签分数保持一致
- ✅ **一致性验证机制**: 新增ConsistencyService验证并修复摘要与标签的一致性
- ✅ **标签-摘要关联**: 高分标签会在摘要中得到明确体现
- ✅ **证据支撑**: 确保分析证据与标签分数相匹配

### 核心功能 (v0.6.3) - 分析进度可视化与标签显示优化
- ✅ **进度预估**: 根据分析模式显示预估剩余时间 (例如: "正在分析... (15s)")
- ✅ **进度条动画**: 显示动态进度条，直观反映分析进度。
- ✅ **模式差异化**: 不同分析模式 (极速/平衡/深度) 显示不同的预估时间。
- ✅ **双向发散条形图优化**: 价值标签左右对齐，百分比显示在双向发散条上方。

### v0.6.2 (2024-01-09) - 主题系统
*   **Feature**: **主题定制**，支持用户自定义外观主题，包括颜色方案、字体、尺寸等。
*   **Feature**: **多套内置主题**，提供多套预设主题，包括知乎白/黑主题、Reddit白/黑主题。
*   **Feature**: **动态主题切换**，支持实时切换主题，无需刷新页面。
*   **Feature**: **CSS变量驱动**，使用CSS变量实现全局主题动态应用，确保所有组件同步更新。
*   **Feature**: **主题管理**，支持创建、编辑、删除自定义主题，并提供主题导入导出功能。

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
*   **Feature**: Supports API Key configuration.
`;
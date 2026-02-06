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
  analysis_button_toggle: "显示分析按钮",
  analysis_button_toggle_desc: "控制是否在该网站显示分析按钮。",
  comment_analysis_toggle: "启用评论分析",
  comment_analysis_toggle_desc: "控制是否在知乎显示评论分析按钮。",
  observability_settings: "可观测性",
  observability_error: "异常监控",
  observability_error_desc: "捕获运行时错误与异常。",
  observability_analytics: "行为分析",
  observability_analytics_desc: "统计功能使用与按钮交互。",
  observability_performance: "性能监测",
  observability_performance_desc: "记录分析耗时与性能指标。",
  observability_compliance: "合规监测",
  observability_compliance_desc: "跟踪脱敏与合规相关信号。",
  observability_endpoint: "遥测上报地址",
  observability_endpoint_desc: "可选。填写后将上报到该地址。",
  observability_endpoint_placeholder: "https://telemetry.example.com/ingest",
  observability_sample_rate: "采样率",
  observability_prod_allow: "允许在生产环境启用",
  observability_prod_allow_desc: "生产环境需要显式授权才会开启遥测。",
  observability_prod_consent: "确认生产环境授权",
  observability_prod_consent_desc: "我已理解生产环境将采集遥测数据。",
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
  error_content_filter: "内容安全审查失败：输入内容被AI服务商标记为可能不当。请尝试切换到DeepSeek或OpenAI等模型。",
  error_missing_api_key: "API Key 缺失 🔑：请为当前选择的模型配置 API Key。",

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
  theme_future_day_name: "未来科技·白天",
  theme_future_day_desc: "明亮玻璃质感与清爽霓虹的科技氛围",
  theme_future_night_name: "未来科技·夜晚",
  theme_future_night_desc: "深夜霓虹与半透明玻璃的赛博对比",
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
  ai_analyzing: "AI 正在分析中",
  progress_eta: "预计剩余",
  progress_overdue: "已超过预估"
};

// DeepProfile 当前版本更新日志
export const zhCNChangelog = `# DeepProfile 当前版本更新日志

## 当前版本: v0.8.1 (Beta) - 内存优化与泄漏修复

### 🚀 内存优化 (v0.8.1)
- **内存泄漏修复**: 修复了后台服务中定时器未正确清理导致的内存泄漏问题
- **事件监听器管理**: 改进了内容脚本中事件监听器的注册与注销机制，防止重复绑定
- **缓存策略优化**: 优化了历史记录的缓存清理机制，定期清理过期数据
- **组件卸载优化**: 改进了React组件的卸载逻辑，确保DOM节点和事件处理器被正确清理
- **资源管理**: 添加了对活动定时器的跟踪，防止定时器累积

### 核心功能 (v0.8.0) - 平台扩展与界面现代化
- ✅ **Quora平台支持**: 新增对Quora平台的用户资料分析支持，包括内容抓取和用户信息提取
- ✅ **Twitter/X平台支持**: 新增对Twitter/X平台的用户资料分析支持，适配新的API接口
- ✅ **界面现代化**: 采用现代化UI设计，更新了设置页面布局，使用卡片式设计提升视觉效果
- ✅ **图标更新**: 为所有支持的平台添加了专属图标，提升界面美观度
- ✅ **响应式增强**: 优化了在不同屏幕尺寸下的界面展示效果

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

### v0.6.0 (2024-01-08) - Reddit平台多语言支持增强
*   **Feature**: 修复了Reddit平台上I18nService初始化问题，确保多语言功能正常工作。
*   **Feature**: 重构了Reddit平台上的按钮注入逻辑，与知乎平台对齐，解决了按钮消失问题。
*   **Feature**: 确保Reddit平台分析按钮和用户资料卡片支持中英界面切换。
*   **Feature**: 实现了与知乎平台对齐的一致按钮注入机制，包括配置检查、清理函数和孤立按钮移除功能。
*   **Feature**: 更新了国际化支持，覆盖加载、分析和错误状态消息，确保界面完全跟随用户语言设置。

### v0.5.0 (2024-01-07) - Reddit平台支持
*   **Feature**: **Reddit平台支持**，新增对Reddit用户资料分析的支持。
*   **Feature**: **跨平台架构**，重构了代码以支持多社交平台扩展。
*   **Feature**: **平台特定配置**，允许为不同平台设置不同的分析参数。
*   **Feature**: **Reddit内容抓取**，实现了针对Reddit API的内容提取和解析。
*   **Feature**: **平台特定UI**，为Reddit适配了用户界面样式。

### v0.4.0 (2024-01-06) - 评论分析功能
*   **Feature**: **评论分析**，新增专门的评论分析功能，分析用户在特定帖子下的评论。
*   **Feature**: **情感分析**，实现对用户评论的情感倾向分析（支持/反对/中立）。
*   **Feature**: **观点聚类**，自动聚类用户评论中的主要观点。
*   **Feature**: **立场识别**，识别用户在争议话题上的立场。
*   **Feature**: **舆论概览**，生成整体舆论的AI总结。

### v0.3.0 (2024-01-05) - 价值标签系统
*   **Feature**: **价值标签体系**，建立了多维度价值取向标签系统（政治、经济、社会、文化、科技等）。
*   **Feature**: **量化分析**，将价值取向转化为-1到1之间的量化分数。
*   **Feature**: **双极坐标**，使用双极坐标系直观展示价值取向。
*   **Feature**: **标签可视化**，通过图表形式展示各维度的价值分布。
*   **Feature**: **标签解释**，为每个标签提供详细说明。

### v0.2.1 (2024-01-04) - 优化与修复
*   **Fix**: 优化了内容抓取逻辑，增加了对API限流的处理。
*   **Fix**: 修复了在某些情况下分析结果显示不完整的问题。
*   **Fix**: 改进了错误处理机制，提供更清晰的错误信息。
*   **UI**: 微调了UI组件样式，提升了视觉效果。
*   **Performance**: 优化了缓存机制，提升了重复查询的响应速度。

### v0.2.0 (2024-01-03) - 深度分析与上下文感知
*   **Feature**: 新增上下文感知功能，根据当前浏览问题自动过滤用户的相关回答。
*   **Feature**: 新增"分析模式"设置（快/均衡/深），深模式支持反讽识别。
*   **Feature**: 个人标签添加置信概率显示。
*   **Feature**: 增强调试模式，显示主题分类和抓取策略。
*   **Fix**: 优化注入逻辑，精确定位到昵称右侧，排除头像干扰。
*   **Fix**: 修复引文链接为API格式的问题，统一转换为网页链接。

### v0.1.0 (2024-01-02) - MVP发布
*   **Feature**: 完成基本架构(Plasmo + React + TypeScript)。
*   **Feature**: 实现知乎API抓取和清理。
*   **Feature**: 连接OpenAI/Gemini/Ollama接口。
*   **Feature**: 实现基本UI注入和资料展示卡片。
*   **Feature**: 支持API Key配置。

`;

// DeepProfile 版本历史记录
export const zhCNVersionHistory = `# DeepProfile 版本历史

### 内存优化 (v0.8.1) - 内存管理与泄漏修复
- ✅ **内存泄漏修复**: 修复了后台服务中定时器未正确清理导致的内存泄漏问题
- ✅ **事件监听器管理**: 改进了内容脚本中事件监听器的注册与注销机制，防止重复绑定
- ✅ **缓存策略优化**: 优化了历史记录的缓存清理机制，定期清理过期数据
- ✅ **组件卸载优化**: 改进了React组件的卸载逻辑，确保DOM节点和事件处理器被正确清理
- ✅ **资源管理**: 添加了对活动定时器的跟踪，防止定时器累积

### 核心功能 (v0.8.0) - 平台扩展与界面现代化
- ✅ **Quora平台支持**: 新增对Quora平台的用户资料分析支持，包括内容抓取和用户信息提取
- ✅ **Twitter/X平台支持**: 新增对Twitter/X平台的用户资料分析支持，适配新的API接口
- ✅ **界面现代化**: 采用现代化UI设计，更新了设置页面布局，使用卡片式设计提升视觉效果
- ✅ **图标更新**: 为所有支持的平台添加了专属图标，提升界面美观度
- ✅ **响应式增强**: 优化了在不同屏幕尺寸下的界面展示效果

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

### v0.6.0 (2024-01-08) - Reddit平台多语言支持增强
*   **Feature**: 修复了Reddit平台上I18nService初始化问题，确保多语言功能正常工作。
*   **Feature**: 重构了Reddit平台上的按钮注入逻辑，与知乎平台对齐，解决了按钮消失问题。
*   **Feature**: 确保Reddit平台分析按钮和用户资料卡片支持中英界面切换。
*   **Feature**: 实现了与知乎平台对齐的一致按钮注入机制，包括配置检查、清理函数和孤立按钮移除功能。
*   **Feature**: 更新了国际化支持，覆盖加载、分析和错误状态消息，确保界面完全跟随用户语言设置。

### v0.5.0 (2024-01-07) - Reddit平台支持
*   **Feature**: **Reddit平台支持**，新增对Reddit用户资料分析的支持。
*   **Feature**: **跨平台架构**，重构了代码以支持多社交平台扩展。
*   **Feature**: **平台特定配置**，允许为不同平台设置不同的分析参数。
*   **Feature**: **Reddit内容抓取**，实现了针对Reddit API的内容提取和解析。
*   **Feature**: **平台特定UI**，为Reddit适配了用户界面样式。

### v0.4.0 (2024-01-06) - 评论分析功能
*   **Feature**: **评论分析**，新增专门的评论分析功能，分析用户在特定帖子下的评论。
*   **Feature**: **情感分析**，实现对用户评论的情感倾向分析（支持/反对/中立）。
*   **Feature**: **观点聚类**，自动聚类用户评论中的主要观点。
*   **Feature**: **立场识别**，识别用户在争议话题上的立场。
*   **Feature**: **舆论概览**，生成整体舆论的AI总结。

### v0.3.0 (2024-01-05) - 价值标签系统
*   **Feature**: **价值标签体系**，建立了多维度价值取向标签系统（政治、经济、社会、文化、科技等）。
*   **Feature**: **量化分析**，将价值取向转化为-1到1之间的量化分数。
*   **Feature**: **双极坐标**，使用双极坐标系直观展示价值取向。
*   **Feature**: **标签可视化**，通过图表形式展示各维度的价值分布。
*   **Feature**: **标签解释**，为每个标签提供详细说明。

### v0.2.1 (2024-01-04) - 优化与修复
*   **Fix**: 优化了内容抓取逻辑，增加了对API限流的处理。
*   **Fix**: 修复了在某些情况下分析结果显示不完整的问题。
*   **Fix**: 改进了错误处理机制，提供更清晰的错误信息。
*   **UI**: 微调了UI组件样式，提升了视觉效果。
*   **Performance**: 优化了缓存机制，提升了重复查询的响应速度。

### v0.2.0 (2024-01-03) - 深度分析与上下文感知
*   **Feature**: 新增上下文感知功能，根据当前浏览问题自动过滤用户的相关回答。
*   **Feature**: 新增"分析模式"设置（快/均衡/深），深模式支持反讽识别。
*   **Feature**: 个人标签添加置信概率显示。
*   **Feature**: 增强调试模式，显示主题分类和抓取策略。
*   **Fix**: 优化注入逻辑，精确定位到昵称右侧，排除头像干扰。
*   **Fix**: 修复引文链接为API格式的问题，统一转换为网页链接。

### v0.1.0 (2024-01-02) - MVP发布
*   **Feature**: 完成基本架构(Plasmo + React + TypeScript)。
*   **Feature**: 实现知乎API抓取和清理。
*   **Feature**: 连接OpenAI/Gemini/Ollama接口。
*   **Feature**: 实现基本UI注入和资料展示卡片。
*   **Feature**: 支持API Key配置。
`;

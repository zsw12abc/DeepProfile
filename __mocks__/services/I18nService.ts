// Mock for I18nService
export class I18nService {
  static t(key: string): string {
    const translations: Record<string, string> = {
      'settings_general': '通用设置',
      'settings_zhihu': '知乎设置',
      'settings_reddit': 'Reddit设置',
      'settings_history': '历史记录',
      'settings_debug': '调试设置',
      'version_info': '版本信息',
      'current_version': '当前版本',
      'changelog': '更新日志',
      'version_history': '版本历史',
      'plugin_enabled': '插件已启用',
      'plugin_disabled': '插件已禁用',
      'plugin_enabled_desc': '插件将在支持的页面上运行',
      'plugin_disabled_desc': '插件将不会在任何页面上运行',
      'ai_provider': 'AI提供商',
      'api_key': 'API密钥',
      'api_base_url': 'API基础URL',
      'model_select': '选择模型',
      'test_connection': '测试连接',
      'connection_success': '连接成功',
      'connection_failed': '连接失败',
      'saved': '已保存',
      'loading': '加载中...',
      'confirm_delete': '确定要删除吗？',
      'confirm_clear_all': '确定要清除所有记录吗？',
      'clear_all': '清除所有',
      'history_empty': '暂无历史记录',
      'export_markdown': '导出Markdown',
      'export_image': '导出图片',
      'delete': '删除',
      'unknown_user': '未知用户',
      'topic_classification': '话题分类',
      'ai_summary': 'AI摘要',
      'value_orientation': '价值观倾向',
      'mode_fast': '快速',
      'mode_balanced': '平衡',
      'mode_deep': '深度',
      'mode_fast_desc': '最少内容，最快分析',
      'mode_balanced_desc': '适中内容，平衡速度与质量',
      'mode_deep_desc': '最多内容，最全面分析',
      'analyze_limit': '分析限制',
      'debug_mode': '调试模式',
      'debug_mode_desc': '启用详细日志记录',
      'saved_successfully': '保存成功',
      'export_image_failed': '图片导出失败',
      'app_description': 'AI驱动的用户画像分析',
      'settings': '设置',
      'app_name': 'DeepProfile',
      'save': '保存',
      'cancel': '取消',
      'analyzing': '分析中',
      'wait_moment': '请稍候',
      'evidence': '证据',
      'debug_info': '调试信息',
      'expand': '展开',
      'collapse': '收起',
      'source': '来源',
      'reanalyze': '重新分析',
      'history_record': '历史记录',
      'error_401': '未授权错误',
      'error_402': '支付必需错误',
      'error_404': '未找到错误',
      'error_429': '请求过多错误',
      'error_500': '服务器错误',
      'error_network': '网络错误',
      'error_zhihu_403': '知乎访问被拒绝',
      'error_user_not_found': '用户未找到',
      'category_politics': '政治',
      'category_economy': '经济',
      'category_society': '社会',
      'category_technology': '科技',
      'category_culture': '文化',
      'category_environment': '环境',
      'category_entertainment': '娱乐',
      'category_lifestyle_career': '生活职业',
      'category_general': '综合',
      'ai_summary': 'AI摘要',
      'topic_classification': '话题分类',
    };
    return translations[key] || key;
  }

  static async init() {
    // Mock init function
  }

  static setLanguage(lang: string) {
    // Mock setLanguage function
  }

  static getLanguage(): string {
    return 'zh-CN';
  }
}
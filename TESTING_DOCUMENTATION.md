# DeepProfile 项目测试文档

## 项目概述
DeepProfile 是一个 Chrome 扩展程序，用于使用 AI 分析知乎用户资料。该项目包含多种功能模块，包括用户资料分析、评论分析、主题分类、多平台支持等。

## 项目架构

### 技术栈
- **前端框架**: React 18.2.0
- **测试框架**: Vitest + Testing Library
- **构建工具**: Plasmo
- **语言**: TypeScript
- **CSS 框架**: Tailwind CSS

### 核心目录结构
```
src/
├── background/           # 后台服务
├── components/           # React 组件
├── contents/             # 内容脚本
├── locales/              # 国际化资源
├── services/             # 业务服务
├── options.tsx           # 选项页面
└── types.d.ts            # 类型定义
```

## 功能模块与测试覆盖情况

### 1. 服务层 (Services)

#### 1.1 CommentAnalysisService
- **功能**: 分析评论内容，提取关键观点和情感倾向
- **测试文件**: `src/services/CommentAnalysisService.test.ts`
- **测试覆盖率**: 76.39% 语句覆盖率
- **测试要点**:
  - 正常评论分析流程
  - LLM 解析错误处理
  - 无效响应处理
  - 评论数量不足的处理

#### 1.2 ConfigService
- **功能**: 管理应用配置和设置
- **测试文件**: `src/services/ConfigService.test.ts`
- **测试覆盖率**: 87.75% 语句覆盖率
- **测试要点**:
  - 配置读取和保存
  - 默认值设置
  - 配置更新

#### 1.3 ExportService
- **功能**: 数据导出功能
- **测试文件**: `src/services/ExportService.test.ts`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - 数据格式化
  - 文件生成

#### 1.4 HistoryService
- **功能**: 用户历史记录管理
- **测试文件**: `src/services/HistoryService.test.ts`
- **测试覆盖率**: 94% 语句覆盖率
- **测试要点**:
  - 记录添加
  - 记录查询
  - 记录删除
  - 记录清理

#### 1.5 I18nService
- **功能**: 国际化服务
- **测试文件**: `src/services/I18nService.test.ts`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - 语言切换
  - 文本翻译

#### 1.6 LLMService
- **功能**: 与大语言模型交互
- **测试文件**: `src/services/LLMService.test.ts`
- **测试覆盖率**: 62.47% 语句覆盖率
- **测试要点**:
  - 消息构建
  - 模型调用
  - 错误处理

#### 1.7 LabelService
- **功能**: 用户标签和分类管理
- **测试文件**: `src/services/LabelService.test.ts`
- **测试覆盖率**: 65.21% 语句覆盖率
- **测试要点**:
  - 标签获取
  - 标签添加
  - 标签更新
  - 标签删除

#### 1.8 LabelUtils
- **功能**: 标签处理工具函数
- **测试文件**: `src/services/LabelUtils.test.ts`
- **测试覆盖率**: 73.48% 语句覆盖率
- **测试要点**:
  - 标签过滤
  - 标签合并
  - 标签验证

#### 1.9 PerformanceTest
- **功能**: 性能测试工具
- **测试文件**: `src/services/PerformanceTest.test.ts`
- **测试覆盖率**: 97.29% 语句覆盖率
- **测试要点**:
  - 性能测量
  - 结果分析

#### 1.10 ProfileService
- **功能**: 用户资料处理
- **测试文件**: `src/services/ProfileService.test.ts`
- **测试覆盖率**: 92.07% 语句覆盖率
- **测试要点**:
  - 资料获取
  - 资料分析
  - 缓存机制

#### 1.11 RedditClient
- **功能**: Reddit API 客户端
- **测试文件**: `src/services/RedditClient.test.ts`
- **测试覆盖率**: 77.43% 语句覆盖率
- **测试要点**:
  - 用户资料获取
  - 用户内容获取
  - 错误处理

#### 1.12 ThemeService
- **功能**: 主题管理
- **测试文件**: `src/services/ThemeService.test.ts`
- **测试覆盖率**: 75.09% 语句覆盖率
- **测试要点**:
  - 主题加载
  - 主题应用
  - 自定义主题

#### 1.13 TopicService
- **功能**: 主题分类
- **测试文件**: `src/services/TopicService.test.ts`
- **测试覆盖率**: 97.2% 语句覆盖率
- **测试要点**:
  - 主题分类
  - LLM 分类
  - 回退机制

#### 1.14 ZhihuClient
- **功能**: 知乎 API 客户端
- **测试文件**: `src/services/ZhihuClient.test.ts`
- **测试覆盖率**: 58.83% 语句覆盖率
- **测试要点**:
  - 用户资料获取
  - 用户内容获取
  - 翻页处理
  - 错误处理

### 2. 组件层 (Components)

#### 2.1 HistorySection
- **功能**: 历史记录展示组件
- **测试文件**: `src/components/HistorySection.test.tsx`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - 历史记录展示
  - 记录删除
  - 加载状态

#### 2.2 MarkdownRenderer
- **功能**: Markdown 渲染组件
- **测试文件**: `src/components/MarkdownRenderer.test.tsx`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - Markdown 渲染
  - 安全处理

#### 2.3 PlatformSettings
- **功能**: 平台设置组件
- **测试文件**: `src/components/PlatformSettings.test.tsx`
- **测试覆盖率**: 89.54% 语句覆盖率
- **测试要点**:
  - 平台配置
  - 设置保存
  - 验证

#### 2.4 ProfileCard
- **功能**: 用户资料卡片组件
- **测试文件**: `src/components/ProfileCard.test.tsx`
- **测试覆盖率**: 92.57% 语句覆盖率
- **测试要点**:
  - 资料展示
  - 图片导出
  - 标签显示

#### 2.5 ThemeSettings
- **功能**: 主题设置组件
- **测试文件**: `src/components/ThemeSettings.test.tsx`
- **测试覆盖率**: 49.68% 语句覆盖率
- **测试要点**:
  - 主题选择
  - 自定义主题创建
  - 预设主题应用

#### 2.6 UIComponents
- **功能**: 通用 UI 组件
- **测试文件**: `src/components/UIComponents.test.tsx`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - 按钮组件
  - 输入框组件
  - 弹窗组件

#### 2.7 VersionInfo
- **功能**: 版本信息组件
- **测试文件**: `src/components/VersionInfo.test.tsx`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - 版本显示
  - 更新日志

#### 2.8 ModelSelector (无测试)
- **功能**: 模型选择组件
- **测试文件**: 无
- **测试覆盖率**: 0% 语句覆盖率
- **功能要点**:
  - 模型选择
  - 参数配置

### 3. 内容脚本 (Content Scripts)

#### 3.1 Overlay Logic
- **功能**: 页面覆盖逻辑
- **测试文件**: `src/contents/overlay-logic.test.ts`
- **测试覆盖率**: 100% 语句覆盖率
- **测试要点**:
  - DOM 操作
  - 事件处理

#### 3.2 Reddit Overlay
- **功能**: Reddit 页面覆盖组件
- **测试文件**: `src/contents/reddit-overlay.test.tsx`
- **测试覆盖率**: ~4% 语句覆盖率
- **功能要点**:
  - Reddit 页面集成
  - 用户资料分析

#### 3.3 Zhihu Comments
- **功能**: 知乎评论分析组件
- **测试文件**: `src/contents/zhihu-comments.test.tsx`
- **测试覆盖率**: 修复后 100% 语句覆盖率
- **测试要点**:
  - 评论提取
  - 分析面板注入

#### 3.4 Zhihu Overlay
- **功能**: 知乎页面覆盖组件
- **测试文件**: `src/contents/zhihu-overlay.test.tsx`
- **测试覆盖率**: ~4% 语句覆盖率
- **功能要点**:
  - 知乎页面集成
  - 用户资料分析

### 4. 背景脚本 (Background Script)

#### 4.1 Background Service
- **功能**: 扩展后台服务
- **测试文件**: `src/background/index.test.ts`
- **测试覆盖率**: 54.21% 语句覆盖率
- **测试要点**:
  - 消息处理
  - 缓存机制
  - API 调用

### 5. 选项页面 (Options Page)

#### 5.1 Options Page
- **功能**: 扩展选项配置页面
- **测试文件**: `src/options.test.tsx`
- **测试覆盖率**: 57.45% 语句覆盖率
- **测试要点**:
  - 标签切换
  - 设置保存
  - 组件渲染

## 测试覆盖率统计

### 整体覆盖率
- **语句覆盖率**: 75.1%
- **分支覆盖率**: 76.47%
- **函数覆盖率**: 41.17%
- **行覆盖率**: 75.1%

### 覆盖率最高的模块
1. [HistoryService.ts](file:///E:/Repo/DeepProfile/DeepProfile/src/services/HistoryService.ts): 94%
2. [TopicService.ts](file:///E:/Repo/DeepProfile/DeepProfile/src/services/TopicService.ts): 97.2%
3. [PerformanceTest.ts](file:///E:/Repo/DeepProfile/DeepProfile/src/services/PerformanceTest.ts): 97.29%
4. [ProfileService.ts](file:///E:/Repo/DeepProfile/DeepProfile/src/services/ProfileService.ts): 92.07%
5. [VersionInfo.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/components/VersionInfo.tsx): 100%

### 覆盖率最低的模块
1. [ModelSelector.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/components/ModelSelector.tsx): 0%
2. [zhihu-comments.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/contents/zhihu-comments.tsx): 4.01%
3. [zhihu-overlay.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/contents/zhihu-overlay.tsx): 4.66%
4. [reddit-overlay.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/contents/reddit-overlay.tsx): 4.04%
5. [ThemeSettings.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/components/ThemeSettings.tsx): 49.68%

## 测试执行

### 运行所有测试
```bash
npm test
```

### 运行带覆盖率的测试
```bash
npx vitest run --coverage
```

### 运行特定测试文件
```bash
npx vitest run src/services/ConfigService.test.ts
```

### 开启测试 UI
```bash
npm run test:ui
```

## 测试最佳实践

### 1. 测试编写原则
- 每个功能模块都应有对应的单元测试
- 测试应覆盖正常流程和异常情况
- 使用 mock 来隔离外部依赖
- 测试名称应清晰描述测试场景

### 2. Chrome 扩展测试注意事项
- 模拟 chrome API（如 chrome.storage, chrome.runtime）
- 处理异步操作和定时器
- 注意 DOM 操作在测试环境中的限制

### 3. React 组件测试最佳实践
- 使用 Testing Library 进行用户行为模拟
- 确保组件在不同状态下正确渲染
- 测试用户交互和事件处理

## 需要改进的测试领域

### 1. 高优先级改进
- [ModelSelector.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/components/ModelSelector.tsx) - 0% 覆盖率，需要添加完整测试
- 内容脚本（content scripts）- 覆盖率极低，需要添加集成测试
- [ThemeSettings.tsx](file:///E:/Repo/DeepProfile/DeepProfile/src/components/ThemeSettings.tsx) - 覆盖率仅 49.68%，需要补充测试

### 2. 错误处理测试
- API 调用失败场景
- 网络错误处理
- 数据解析错误处理

### 3. 边界条件测试
- 空数据处理
- 极值输入
- 并发操作

## 测试环境配置

### Vitest 配置
- 测试环境: jsdom
- 全局 setup: [test-setup.ts](file:///E:/Repo/DeepProfile/DeepProfile/test-setup.ts)
- 测试超时: 默认 5000ms

### Mock 配置
- Chrome API 模拟
- 网络请求拦截
- 本地存储模拟

## CI/CD 集成

测试集成到构建流程中，在每次提交时自动运行，确保代码质量和功能完整性。

# DeepProfile Chrome Web Store 自动化发布配置

本文用于配置 `.github/workflows/release.yml` 的 CWS 自动发布能力。

## 1. 前置条件
- 已加入 Chrome Web Store Developer Program
- 扩展已在 CWS Dashboard 创建（至少有一个草稿版本）
- GitHub 仓库已启用 Actions

## 2. 获取 `CWS_EXTENSION_ID`
1. 打开 Chrome Web Store Developer Dashboard
2. 进入你的扩展详情页
3. 复制扩展 ID（32 位字符串），保存为 `CWS_EXTENSION_ID`

## 3. 获取 `CWS_CLIENT_ID` 与 `CWS_CLIENT_SECRET`
1. 进入 Google Cloud Console，创建或选择一个项目
2. 启用 `Chrome Web Store API`
3. 在 `APIs & Services > Credentials` 创建 `OAuth client ID`
4. 应用类型选择 Web application
5. 按 Google 当下页面要求配置 redirect URI
6. 记录生成的 Client ID 与 Client Secret

## 4. 获取 `CWS_REFRESH_TOKEN`
1. 使用上一步 OAuth Client 完成一次用户授权
2. 申请离线访问（offline access）
3. 用授权码换取 token，保存 refresh token 作为 `CWS_REFRESH_TOKEN`

说明：Google 的 OAuth 页面文案和入口会变化，请以控制台当前提示为准，核心目标是拿到可调用 CWS API 的 refresh token。

## 5. 在 GitHub Secrets 中配置
仓库路径：`Settings > Secrets and variables > Actions > New repository secret`

需要配置 4 个 Secret：
- `CWS_EXTENSION_ID`
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

## 6. 触发自动发布
### 方式 A：发布 GitHub Release（推荐）
1. 先本地确认 `npm run release:check` 通过
2. 创建并推送 tag（例如 `v1.0.2`）
3. 在 GitHub 发布该 tag 的 Release（Published）
4. `Release Extension` workflow 会自动构建、打包、上传并发布到 CWS

### 方式 B：手动触发 workflow
1. 打开 `Actions > Release Extension > Run workflow`
2. `publish=true`：上传后直接发布
3. `publish_target` 可选：
- `default`
- `trustedTesters`

## 7. 常见问题排查
- Workflow 日志出现缺失 secrets 警告：检查 4 个 CWS secrets 是否都已设置
- CWS 发布失败：先在 CWS Dashboard 手动上传一次确认扩展状态正常，再重试自动发布
- 版本号冲突：先更新 `package.json` 中 `version`，重新打包发布

## 8. 本仓库发布命令
- 预检：`npm run release:check`
- 构建：`npm run build`
- 打包：`npx plasmo package`

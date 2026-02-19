# Chrome Web Store 提交清单（DeepProfile v1.0.0）

## 1. 上传包
- [ ] 执行 `npm run build`
- [ ] 执行 `npx plasmo package`
- [ ] 在打包输出目录确认 zip 文件存在（用于上传到 CWS）
- [ ] 解压自检 `manifest.json`：
  - [ ] `version` 为 `1.0.0`
  - [ ] `permissions` 仅包含 `storage`

## 2. Store Listing（商店信息）
- [ ] 名称：`DeepProfile`
- [ ] 简短描述与详细描述使用 `STORE_DESCRIPTION.md`
- [ ] 描述中平台范围与实际一致：Zhihu / Reddit / X(Twitter) / Quora
- [ ] 上传图标（128x128）与截图（建议 1280x800 或 640x400）
- [ ] 选择正确分类（建议 Productivity）

## 3. Privacy（隐私披露）
- [ ] 隐私政策链接使用仓库内最新文档对应 URL
- [ ] 声明数据存储在本地（API Key、历史记录）
- [ ] 声明不提供默认第三方追踪服务
- [ ] 声明可选遥测默认关闭，仅用户显式启用后才可能上报到用户配置 endpoint
- [ ] 声明会向用户配置的 AI Provider 发送公开内容用于分析

## 4. Permissions Justification（权限说明）
- [ ] `storage`：用于本地配置和历史缓存
- [ ] host permissions：用于在目标站点注入分析功能（Zhihu/Reddit/X/Quora）
- [ ] 不申请不必要权限（例如已移除 `cookies`）

## 5. Single Purpose（单一用途）
- [ ] 在描述中明确核心用途：社交媒体用户画像分析
- [ ] 避免出现与主功能无关的营销或模糊功能描述

## 6. 发布前回归
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] 手工验证：四个平台至少各测 1 次按钮注入与分析流程

## 7. 提交流程
1. Chrome Web Store Developer Dashboard 新建或更新现有条目
2. 上传最新 zip 包
3. 填写 Listing / Privacy / Permissions 说明
4. 保存草稿后执行预检（若有）
5. 提交审核并记录提交日期

## 8. 提交后追踪
- [ ] 记录审核单号与提交时间
- [ ] 若被拒，按 rejection reason 定位到文件并修复
- [ ] 修复后提高 `version`（patch）并重新打包提交

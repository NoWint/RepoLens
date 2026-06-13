# RepoLens Comprehensive Refactoring Design

## Overview

对 RepoLens 进行 GitHub 一流水平的全面重构，覆盖架构、代码质量、UI/UX、性能四个维度。

## Architecture Changes

### 1. Custom Hooks 提取

**问题**：SSE 流式解析逻辑在 `page.tsx` 和 `report/[id]/page.tsx` 中重复实现。

**方案**：
- `hooks/use-analysis.ts`：封装 SSE 流式分析逻辑，返回 `{ analyze, isLoading, progress, error }`
- `hooks/use-report.ts`：封装报告数据获取逻辑，返回 `{ report, error, isLoading }`

### 2. 死代码清理

- 删除 `app/analyze/page.tsx`（未使用的中间页面）
- 删除 `scanner.ts` 中的 `buildFileTreeFromGitHub`（只返回输入）
- 删除 `analyzer.ts` 中的 `ProgressCallback` 重复导出（已在 `pipeline.ts` 中定义）

### 3. 错误类型系统

- 新增 `lib/errors.ts`：定义 `AnalysisError`、`GitHubAPIError`、`RateLimitError` 等自定义错误类
- API Route 使用自定义错误类型返回结构化错误信息

### 4. Pipeline 返回类型优化

- `executePipeline` 返回明确的 `PipelineResult` 类型，替代当前的匿名对象展开

## Code Quality

### 1. ThemeToggle 修复

**问题**：在渲染期间调用 `setHasMounted`，违反 React 规则。

**方案**：使用 `useEffect` 进行客户端挂载检测。

### 2. Architecture 组件安全

**问题**：使用 `innerHTML` 直接设置 Mermaid SVG。

**方案**：使用 `dangerouslySetInnerHTML` 替代直接 DOM 操作，同时支持暗色模式。

### 3. 共享常量提取

- 评分阈值标签提取为 `lib/constants.ts` 中的 `SCORE_LABELS`
- 健康度颜色逻辑提取为 `lib/colors.ts` 中的共享函数

## UI/UX Overhaul

### 1. 首页重设计

- 渐变背景 Hero 区域
- 动画 Logo 和标题
- 更好的视觉层次和间距
- 特性展示卡片

### 2. 报告页升级

- Sidebar 使用 Lucide 图标替代 emoji
- 平滑的 section 切换动画
- 更好的卡片设计和间距
- 健康度评分动画
- 架构图暗色模式支持

### 3. CSS 设计系统

- 完善的 CSS 变量系统（亮色/暗色）
- 统一的间距和圆角
- 动画关键帧
- 更好的排版

### 4. 加载状态

- 骨架屏替代简单的 spinner
- 渐进式内容加载

## Performance

### 1. 组件优化

- `React.memo` 包裹纯展示组件
- `useMemo` 缓存计算结果
- 懒加载 Mermaid 渲染

### 2. 文件树优化

- 虚拟化大文件树（保留当前实现，添加节点数量限制提示）

## Implementation Order

1. 核心库重构（hooks、errors、清理死代码）
2. CSS 设计系统升级
3. UI 组件重构
4. 页面重构
5. 验证

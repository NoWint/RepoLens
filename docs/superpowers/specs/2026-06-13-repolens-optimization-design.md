# RepoLens Production Optimization Design

## Overview

对 RepoLens MVP 进行全面生产级优化，解决 42 个已识别问题（6 Critical / 16 High / 19 Medium / 1 Low），覆盖架构、性能、安全、代码质量、可维护性、可扩展性、用户体验和生产就绪性八个维度。

**方案**：渐进式重构（5 阶段），每阶段可独立验证。

**原则**：极致实用性 + 极致长期主义

---

## Phase 1: Critical Fixes

### 1.1 纯 API 模式 — 移除 git clone

彻底移除文件系统依赖，完全使用 GitHub API 获取数据。

**删除**：
- `lib/scanner.ts` 中的 `cloneRepo`、`cleanupClone` 函数
- `lib/analyzer.ts` 中的克隆逻辑

**重写**：
- `scanDirectory` → `buildFileTreeFromGitHub`：从 GitHub Tree API 数据构建 FileTreeNode
- `parser.ts`：不再从本地文件系统读取，改为接收 `{ path: string, content: string }[]` 作为输入
- `analyzer.ts`：移除克隆逻辑，改为调用 GitHub API 获取文件内容

**新增**：
- `GitHubService.getMultipleFiles(paths: string[])`：并行获取多个文件内容
- `GitHubService.getDirectoryListing(path: string)`：获取指定目录内容

**新数据流**：
```
GitHub API → getFileTree → getMultipleFiles(关键文件) → 正则解析依赖
```

**优势**：
- 彻底解决 Vercel 兼容性（无文件系统依赖）
- 消除 git clone 超时风险
- 更精确的仓库大小控制

### 1.2 Error Boundary

添加 Next.js App Router 错误处理约定文件：
- `app/error.tsx`：全局错误边界
- `app/report/[id]/error.tsx`：报告页错误边界
- `app/global-error.tsx`：根布局错误边界

### 1.3 Token 安全

- 移除 GET 请求中的 token 参数（`/api/github` 路由）
- Token 仅通过 POST body 传输
- 添加 `Cache-Control: no-store` 响应头
- 移除 `app/api/github/route.ts`（合并到 `/api/analyze`）

### 1.4 函数超时优化

- Pipeline 各阶段内部并行化（`Promise.all`）
- `getRepoMeta` + `listLanguages` + `getFileContent("README.md")` 并行
- `getFileTree` + `getMultipleFiles(configFiles)` 并行
- `generateSummary` + `generateDiagrams` + `calculateHealthScore` 并行

---

## Phase 2: Architecture Refactoring

### 2.1 Pipeline 模式

将 `analyzeRepository` 上帝函数拆分为 4 个独立阶段：

```
Phase 1: MetadataPhase
  输入: url, token
  输出: RepoMeta, languages, readmeContent
  并行: getRepoMeta + listLanguages + getFileContent

Phase 2: StructurePhase
  输入: RepoMeta, GitHubService
  输出: FileTreeNode, DirectoryPattern[], configFiles
  并行: getFileTree + getMultipleFiles(config files)

Phase 3: AnalysisPhase
  输入: FileTreeNode, configFiles, languages
  输出: TechStack, DependencyMap
  并行: identifyTechStack + parseDependencies

Phase 4: ReportPhase
  输入: 所有 Phase 输出
  输出: AISummary, Diagrams, HealthScore
  并行: generateSummary + generateDiagrams + calculateHealthScore
```

**新增文件**：
- `lib/pipeline.ts`：Pipeline 编排器 + 进度回调
- `lib/config.ts`：所有配置常量
- `lib/logger.ts`：结构化日志

### 2.2 GitHubService 重设计

- `owner`/`repo` 作为构造函数参数传入，移除 `setRepo` 方法
- 新增 `listLanguages(): Promise<Record<string, number>>` 公共方法
- 新增 `getMultipleFiles(paths: string[]): Promise<Record<string, string | null>>` 方法
- 新增 `getDirectoryListing(path: string)` 方法
- 检查 `getFileTree` 的 `truncated` 字段

### 2.3 API 路由重构

- 移除 `app/api/github/route.ts`，复用 `GitHubService`
- `/api/analyze` 改为 SSE 流式响应，逐步返回进度
- 新增 `/api/report/[id]` GET 路由，从 Vercel KV 获取已存储的报告

---

## Phase 3: Code Quality

### 3.1 parser.ts 去重

提取 `collectSourceFiles(rootPath)` 公共函数，`parseRepository` 和 `parseEntryFiles` 共用文件收集逻辑。

### 3.2 Go 正则修复

改为 `/import\s+(?:\([\s\S]*?\)|\s*"([^"]+)")/g`，正确匹配 Go 导入语句。

### 3.3 假分数处理

- 移除 `hasWiki` 硬编码
- 移除 `Issue/PR ratio` 和 `PR merge time` 固定分数
- 调整 `maxPoints`：文档质量 85（移除 Wiki 15分）、Issue 活跃度 85（移除 ratio 15分）、维护情况 85（移除 PR merge 15分）
- 总分按比例归一化到 0-100

### 3.4 私有属性访问

新增 `GitHubService.listLanguages()` 公共方法，移除 `analyzer.ts` 中的 `github["octokit"]` 访问。

### 3.5 正则 g 标志

`IMPORT_PATTERNS` 中去掉 `g` 标志，在 `extractImportsWithRegex` 中统一添加。

### 3.6 skipDirs 统一

提取到 `lib/constants.ts`，scanner 和 parser 共享同一常量 `SKIP_DIRS`。

### 3.7 点文件处理

parser.ts 与 scanner.ts 一致，对 `.env.example` 等有意义的点文件做例外处理。

### 3.8 测试

引入 `vitest`，优先测试：
- `parser.ts`（各语言导入提取）
- `health.ts`（评分计算）
- `github.ts`（URL 解析）
- `diagram.ts`（Mermaid ID 清理）
- `pipeline.ts`（阶段编排）

---

## Phase 4: Production Readiness

### 4.1 Vercel KV 报告持久化

- 分析完成后存储到 Vercel KV，key = `report:{owner}/{repo}:{branch}`
- TTL = 24 小时
- 新增 `/api/report/[id]` GET 路由获取已存储报告
- 报告页优先从 KV 获取，无需重新分析

### 4.2 Rate Limiting

使用 Vercel KV 实现基于 IP 的速率限制：
- 无 Token：10 次/小时
- 有 Token：30 次/小时
- 返回 `429 Too Many Requests` + `Retry-After` header

### 4.3 安全 Header

在 `next.config.ts` 中配置：
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'`
- `poweredByHeader: false`

### 4.4 Mermaid 安全

`securityLevel` 改为 `"strict"`，使用 `dangerouslySetInnerHTML` 代替直接 DOM 操作。

### 4.5 环境变量验证

启动时检查 `OPENAI_API_KEY`，缺失时在 UI 上标注"AI 增强摘要不可用"。

### 4.6 监控集成

- 集成 Sentry（Next.js 官方集成）捕获运行时错误
- 添加 Vercel Analytics 监控 Web Vitals

### 4.7 404 页面

添加 `app/not-found.tsx` 自定义 404 页面。

### 4.8 LRU 缓存

实现 LRU 缓存替代无限 Map，限制最大 50 个条目。

---

## Phase 5: UI/UX Optimization

### 5.1 进度反馈系统

- `/api/analyze` 改为 SSE 流式响应
- 前端实时显示当前阶段：
  - "获取元数据..."
  - "扫描文件结构..."
  - "分析技术栈..."
  - "生成摘要..."
  - "计算健康度..."
- 每个阶段完成后更新进度条

### 5.2 响应式设计

- 移动端：Sidebar 改为底部 Tab 栏（`md:` 断点切换）
- 报告内容区自适应宽度
- 文件树组件添加虚拟滚动（`@tanstack/react-virtual`）

### 5.3 暗色模式

- 使用 Tailwind `dark:` 类 + `next-themes`
- 尊重系统偏好，支持手动切换
- 添加主题切换按钮到 header

### 5.4 无障碍 (A11y)

- Sidebar 添加 `aria-current` 标识当前项
- 文件树添加 `role="tree"` / `role="treeitem"`
- 用 `lucide-react` 图标替代 emoji
- Mermaid SVG 添加 `aria-label`

### 5.5 报告页面改进

- 添加 `app/report/[id]/loading.tsx` 骨架屏
- 报告刷新后从 Vercel KV 恢复
- 添加"导出 PDF"功能（`html2pdf.js`）

---

## Issue Tracking

| ID | Category | Severity | Description | Phase |
|----|----------|----------|-------------|-------|
| A-1 | Architecture | Critical | analyzer.ts 上帝函数 | 2 |
| A-2 | Architecture | High | GitHubService 有状态单例 | 2 |
| A-3 | Architecture | Medium | API 路由重复实现 | 2 |
| A-4 | Architecture | Medium | skipDirs 重复不一致 | 3 |
| CQ-1 | Code Quality | High | parser.ts 代码克隆 | 3 |
| CQ-2 | Code Quality | High | Go 正则过于宽泛 | 3 |
| CQ-3 | Code Quality | Critical | 零测试覆盖 | 3 |
| CQ-4 | Code Quality | Medium | 假分数 | 3 |
| CQ-5 | Code Quality | Medium | 私有属性访问 | 3 |
| CQ-6 | Code Quality | Low | 正则 g 标志隐患 | 3 |
| P-1 | Performance | Critical | 串行执行超时风险 | 1 |
| P-2 | Performance | High | execSync 阻塞 | 1 |
| P-3 | Performance | High | 同步文件系统 API | 1 |
| P-4 | Performance | Medium | checkFileExists 串行 | 2 |
| P-5 | Performance | High | 内存缓存无限制 | 4 |
| P-6 | Performance | Medium | getFileTree 截断 | 2 |
| S-1 | Scalability | Critical | git clone Vercel 不可用 | 1 |
| S-2 | Scalability | High | sessionStorage 大小限制 | 4 |
| S-3 | Scalability | Medium | API 分页不完整 | 2 |
| M-1 | Maintainability | Medium | 硬编码魔法数字 | 2 |
| M-2 | Maintainability | High | 缺少日志系统 | 2 |
| M-3 | Maintainability | High | catch 吞错误 | 2 |
| M-4 | Maintainability | Medium | 点文件跳过不一致 | 3 |
| UX-1 | UX | High | 无进度反馈 | 5 |
| UX-2 | UX | High | 刷新数据丢失 | 4 |
| UX-3 | UX | Medium | 文件树性能差 | 5 |
| UX-4 | UX | Medium | Mermaid 安全+DOM | 4 |
| UX-5 | UX | Medium | 无障碍缺失 | 5 |
| UX-6 | UX | Medium | 移动端适配不足 | 5 |
| SEC-1 | Security | Critical | Token 传输不安全 | 1 |
| SEC-2 | Security | High | SSRF 风险 | 1 |
| SEC-3 | Security | High | 命令注入 | 1 |
| SEC-4 | Security | Medium | Mermaid XSS | 4 |
| SEC-5 | Security | High | 无 Rate Limiting | 4 |
| SEC-6 | Security | Medium | 缺少安全 Header | 4 |
| PR-1 | Prod Readiness | Critical | 缺少 Error Boundary | 1 |
| PR-2 | Prod Readiness | High | 缺少 error.tsx/loading.tsx | 1 |
| PR-3 | Prod Readiness | High | 缺少监控 | 4 |
| PR-4 | Prod Readiness | Medium | 缺少 404 页面 | 4 |
| PR-5 | Prod Readiness | Medium | next.config 空配置 | 4 |
| PR-6 | Prod Readiness | Medium | 环境变量无验证 | 4 |

---

## New Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| `@vercel/kv` | 报告持久化 + Rate Limiting | 4 |
| `vitest` | 单元测试 | 3 |
| `next-themes` | 暗色模式 | 5 |
| `@tanstack/react-virtual` | 文件树虚拟滚动 | 5 |
| `html2pdf.js` | PDF 导出 | 5 |
| `@sentry/nextjs` | 错误监控 | 4 |

## Removed Dependencies

| Package | Reason | Phase |
|---------|--------|-------|
| `tree-sitter` + grammars | 纯 API 模式不需要本地解析 | 1 |

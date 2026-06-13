# RepoLens Design Spec

## Overview

RepoLens 是 GitHub 仓库深度分析工具。输入仓库地址即可获得包含文件结构、技术栈、AI 摘要、架构图和健康度评分的完整分析报告。

**设计原则**：极致实用性 + 极致长期主义

**目标用户**：开发者选型（评估开源项目是否值得采用/贡献）+ 代码审查（快速了解陌生仓库架构）

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  首页     │  │ 分析页   │  │  报告页        │  │
│  │ URL 输入  │  │ Loading  │  │ 分栏导航+内容  │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │           API Routes (Serverless)          │  │
│  │  /api/analyze  →  主分析入口                │  │
│  │  /api/github   →  GitHub API 代理           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │            Core Services (lib/)             │  │
│  │  github.ts   → GitHub API 封装              │  │
│  │  scanner.ts  → 仓库克隆+文件扫描            │  │
│  │  parser.ts   → Tree-sitter 解析引擎         │  │
│  │  analyzer.ts → 分析编排器                    │  │
│  │  summary.ts  → 规则模板+LLM 摘要生成        │  │
│  │  diagram.ts  → Mermaid 图生成               │  │
│  │  health.ts   → 健康度评分                    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │           External Dependencies             │  │
│  │  GitHub REST/GraphQL API                    │  │
│  │  Tree-sitter (native bindings)              │  │
│  │  LLM API (OpenAI/Claude)                    │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 架构方案：轻量 API 聚合

Next.js API Routes 作为薄编排层，直接调用 GitHub API + 本地 Tree-sitter 解析，不引入消息队列。

- **数据流**：用户输入 URL → API Route 获取 GitHub 元数据 → 克隆到 /tmp → Tree-sitter 解析 → 规则模板生成基础摘要 → LLM API 润色 → 返回报告
- **优点**：架构简单，Vercel 部署友好，开发速度快，MVP 可快速验证
- **演进路径**：后续迁移到 Vercel Edge Functions 或加异步队列支持大仓库

### 关键设计决策

1. **API Routes 作为薄编排层**：每个 Route 只做参数校验和调用 lib 服务，业务逻辑全部在 lib/ 中，便于测试和复用
2. **GitHub API 双模式**：无 Token 时用 REST API（60次/小时），有 Token 时用 GraphQL API（5000次/小时，一次请求获取更多数据）
3. **Tree-sitter native bindings**：使用 tree-sitter Node.js 绑定 + 语言 grammar 包，在 Vercel Serverless 中运行
4. **分析编排器**：analyzer.ts 是核心，协调各服务的执行顺序和数据流转

## Data Flow

### 分析流程

```
用户输入 URL
    │
    ▼
┌─ GitHub API ─────────────────────────────┐
│  1. 获取仓库元数据 (name, desc, stars…)  │
│  2. 获取文件树 (tree SHA)                │
│  3. 获取 Issues/PRs 统计                 │
│  4. 获取 README / CONTRIBUTING 等文档    │
│  5. 获取最近 commits 活跃度              │
└──────────────────────────────────────────┘
    │
    ▼
┌─ Scanner ────────────────────────────────┐
│  1. 浅克隆仓库到 /tmp (depth=1)          │
│  2. 遍历文件树，收集文件路径和大小        │
│  3. 识别目录结构模式 (src/, lib/, app/)  │
│  4. 提取配置文件 (package.json, etc.)    │
└──────────────────────────────────────────┘
    │
    ▼
┌─ Parser (Tree-sitter) ──────────────────┐
│  1. 按语言加载 grammar                   │
│  2. 解析入口文件和核心模块               │
│  3. 提取 import/require 语句             │
│  4. 构建 模块→依赖 映射表               │
└──────────────────────────────────────────┘
    │
    ▼
┌─ 并行执行三个分析器 ────────────────────┐
│  ┌─ Summary ──┐  ┌─ Diagram ──┐  ┌─ Health ──┐ │
│  │规则模板生成 │  │模块依赖图   │  │文档质量    │ │
│  │基础摘要    │  │目录结构图   │  │Issue活跃度 │ │
│  │LLM 润色   │  │Mermaid 输出 │  │维护情况    │ │
│  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────┘
    │
    ▼
  返回完整分析报告 (JSON)
```

### 核心服务职责

| 服务 | 输入 | 输出 | 关键实现 |
|------|------|------|----------|
| github.ts | 仓库 URL + 可选 Token | 仓库元数据、文件树、Issues 统计 | Octokit 封装，双模式认证 |
| scanner.ts | 克隆路径 | 文件结构、目录模式、配置文件 | fs 遍历 + 模式匹配 |
| parser.ts | 文件路径列表 | 模块依赖映射 | tree-sitter + language grammars |
| summary.ts | 元数据 + 文件结构 + 依赖映射 | 项目介绍、架构说明、技术分析 | 规则模板拼接 → LLM API 润色 |
| diagram.ts | 依赖映射 + 目录结构 | Mermaid 代码 | 规则生成，无 LLM 依赖 |
| health.ts | Issues/PRs/commits/文档 | 健康度评分 (0-100) | 加权评分算法 |

### 仓库大小限制策略

- 文件数 > 10,000 → 仅 GitHub API 分析，不克隆
- 仓库大小 > 50MB → 浅克隆 + 仅解析入口文件
- 正常仓库 → 完整分析

## UI Design

### 页面路由

| 路由 | 功能 | 说明 |
|------|------|------|
| / | 首页 | URL 输入框 + 可选 Token 输入 + 历史记录 |
| /analyze | 分析中 | Loading 动画 + 进度提示 |
| /report/[id] | 报告页 | 分栏导航 + 各维度分析内容 |

### 报告页分栏导航结构

```
┌──────────────────────────────────────────────────┐
│  RepoLens    [仓库全名]    [重新分析] [导出PDF]   │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│  概览     │  ┌─ 概览内容区 ──────────────────┐   │
│  文件结构  │  │  项目名称 / 描述               │   │
│  技术栈   │  │  Stars / Forks / Issues        │   │
│  AI 总结  │  │  技术栈标签                     │   │
│  架构图   │  │  健康度评分仪表盘               │   │
│  健康度   │  └────────────────────────────────┘   │
│          │                                       │
├──────────┴───────────────────────────────────────┤
│  Powered by RepoLens                              │
└──────────────────────────────────────────────────┘
```

### 各导航项内容

1. **概览**：项目基本信息 + 健康度仪表盘 + 技术栈标签云
2. **文件结构**：可折叠的文件树 + 目录说明
3. **技术栈**：语言占比饼图 + 框架/库列表 + 版本信息
4. **AI 总结**：项目介绍 / 架构说明 / 技术分析三个子章节
5. **架构图**：Mermaid 渲染的模块依赖图 + 目录结构图，支持缩放
6. **健康度**：文档质量 / Issue 活跃度 / 维护情况 三维评分 + 详细指标

### UI 技术栈

- **组件库**：shadcn/ui（与 Next.js 深度集成，可定制性强）
- **图表**：Recharts（轻量，React 原生）
- **Mermaid 渲染**：mermaid.js（客户端渲染）
- **文件树**：自定义组件，支持折叠/展开

## Health Score Algorithm

### 评分维度与权重

| 维度 | 权重 | 指标 | 数据来源 |
|------|------|------|----------|
| 文档质量 | 30% | README 完整度、CONTRIBUTING 存在性、CHANGELOG 存在性、Wiki 活跃度 | GitHub API |
| Issue 活跃度 | 35% | 开放 Issue 数、平均关闭时间、Issue 增长趋势、标签使用率 | GitHub API (GraphQL) |
| 维护情况 | 35% | 最近 commit 时间、commit 频率、发布频率、贡献者数量、PR 合并速度 | GitHub API (GraphQL) |

### 评分算法

```
Health Score = 文档质量×0.30 + Issue活跃度×0.35 + 维护情况×0.35

每个维度 0-100 分，具体计算：

文档质量:
  - README 长度 > 500字: +30
  - README 包含安装说明: +20
  - CONTRIBUTING.md 存在: +20
  - CHANGELOG 存在: +15
  - Wiki 有内容: +15

Issue 活跃度:
  - 开放 Issue < 50: +25
  - 平均关闭时间 < 7天: +25
  - Issue 有标签: +20
  - 近30天有 Issue 关闭: +15
  - Issue/PR 比例合理: +15

维护情况:
  - 最近 commit < 30天: +25
  - 月 commit > 10: +25
  - 贡献者 > 5: +20
  - 近6个月有 release: +15
  - PR 平均合并时间 < 14天: +15
```

### 评分展示

- 0-40：红色（高风险）
- 41-70：黄色（中等）
- 71-100：绿色（健康）

用环形进度条 + 数字 + 颜色直观展示。

## Tech Stack

| 类别 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | Vercel 原生，SSR/SSG 灵活 |
| 语言 | TypeScript | 类型安全，长期维护 |
| UI | shadcn/ui + Tailwind CSS | 可定制，不引入重依赖 |
| 图表 | Recharts | 轻量 React 图表库 |
| GitHub API | Octokit | 官方 SDK，REST + GraphQL |
| 代码解析 | tree-sitter (node bindings) | 多语言 AST 解析 |
| LLM | OpenAI API (可扩展) | 混合方案中的润色层 |
| Mermaid | mermaid.js | 客户端渲染图表 |
| 部署 | Vercel | 零配置部署，Serverless |

## Project Structure

```
repolens/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 首页
│   ├── analyze/
│   │   └── page.tsx                # 分析中
│   ├── report/
│   │   └── [id]/
│   │       └── page.tsx            # 报告页
│   └── api/
│       ├── analyze/
│       │   └── route.ts            # 主分析 API
│       └── github/
│           └── route.ts            # GitHub API 代理
├── lib/
│   ├── github.ts                   # GitHub API 封装
│   ├── scanner.ts                  # 仓库克隆+文件扫描
│   ├── parser.ts                   # Tree-sitter 解析引擎
│   ├── analyzer.ts                 # 分析编排器
│   ├── summary/
│   │   ├── templates.ts            # 规则模板
│   │   └── llm.ts                  # LLM 润色
│   ├── diagram.ts                  # Mermaid 图生成
│   ├── health.ts                   # 健康度评分
│   └── types.ts                    # 类型定义
├── components/
│   ├── ui/                         # shadcn/ui 组件
│   ├── report/                     # 报告页组件
│   │   ├── sidebar.tsx
│   │   ├── overview.tsx
│   │   ├── file-tree.tsx
│   │   ├── tech-stack.tsx
│   │   ├── ai-summary.tsx
│   │   ├── architecture.tsx
│   │   └── health-score.tsx
│   └── shared/                     # 共享组件
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## API Design

### POST /api/analyze

```typescript
// Request
{ url: "https://github.com/owner/repo", token?: string }

// Response
{
  id: string,           // 分析结果缓存 key
  meta: RepoMeta,       // 仓库元数据
  structure: FileTree,  // 文件结构
  techStack: TechStack, // 技术栈
  summary: AISummary,   // AI 摘要
  diagrams: Diagrams,   // Mermaid 图
  health: HealthScore   // 健康度
}
```

### GET /api/github?url=...

```typescript
// 代理 GitHub API，前端用于实时获取仓库基本信息
// Response: { name, description, stars, forks, language, ... }
```

## Error Handling

### 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| 仓库不存在/私有 | 前端提示"仓库不存在或为私有仓库，请输入 Token 重试" |
| GitHub API 限流 | 显示剩余配额，提示添加 Token 或稍后重试 |
| 仓库过大 (>50MB) | 降级为仅 GitHub API 分析，不克隆，提示"大型仓库，部分分析受限" |
| Tree-sitter 解析失败 | 跳过该文件，不影响整体分析 |
| LLM API 调用失败 | 降级为仅规则模板输出，标注"AI 增强摘要不可用" |
| 克隆超时 | 10s 超时限制，降级为 API-only 模式 |

### 缓存策略

- 分析结果缓存到内存（Map），key = `owner/repo:branch`
- 缓存 TTL = 1 小时，避免重复分析
- 长期演进：迁移到 Vercel KV (Redis) 持久化缓存

### 安全考虑

- Token 仅在当次请求中使用，不持久化存储
- API Route 校验 GitHub URL 格式，防止 SSRF
- 仓库大小预检（通过 GitHub API 获取大小后再决定是否克隆）

## MVP Scope

MVP 包含全部四个核心功能：

1. **仓库扫描 + 技术栈识别**：输入 GitHub URL，展示仓库基本信息、文件结构树、技术栈列表
2. **AI Summary**：自动生成项目介绍、架构说明、技术分析
3. **Architecture Diagram**：生成模块依赖关系的 Mermaid 图
4. **Health Score**：文档质量、Issue 活跃度、维护情况的评分

## Evolution Path

- V1 (MVP)：轻量 API 聚合，实时分析，Vercel 部署
- V2：异步分析队列（Redis + Bull），支持大仓库
- V3：分析历史持久化（Vercel KV），用户账户系统
- V4：对比分析（多个仓库横向对比），趋势追踪

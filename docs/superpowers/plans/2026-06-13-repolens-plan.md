# RepoLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build RepoLens, a GitHub repository analysis tool that generates deep analysis reports from a repo URL.

**Architecture:** Next.js 14 App Router with lightweight API aggregation. API Routes orchestrate GitHub API calls, local Tree-sitter parsing, and LLM-powered summary refinement. Results returned as JSON and rendered client-side with a sidebar navigation report layout.

**Tech Stack:** Next.js 14, TypeScript, shadcn/ui, Tailwind CSS, Recharts, Octokit, tree-sitter, OpenAI API, mermaid.js, Vercel

---

## File Structure

```
repolens/
├── app/
│   ├── layout.tsx                         # Root layout with fonts and providers
│   ├── page.tsx                           # Home page with URL input
│   ├── analyze/
│   │   └── page.tsx                       # Analysis loading page
│   ├── report/
│   │   └── [id]/
│   │       └── page.tsx                   # Report page with sidebar nav
│   └── api/
│       ├── analyze/
│       │   └── route.ts                   # Main analysis API endpoint
│       └── github/
│           └── route.ts                   # GitHub API proxy
├── lib/
│   ├── types.ts                           # All TypeScript type definitions
│   ├── github.ts                          # GitHub API wrapper (Octokit)
│   ├── scanner.ts                         # Repo clone + file scanning
│   ├── parser.ts                          # Tree-sitter parsing engine
│   ├── analyzer.ts                        # Analysis orchestrator
│   ├── summary/
│   │   ├── templates.ts                   # Rule-based summary templates
│   │   └── llm.ts                         # LLM refinement layer
│   ├── diagram.ts                         # Mermaid diagram generation
│   └── health.ts                          # Health score calculation
├── components/
│   ├── ui/                                # shadcn/ui components
│   ├── report/
│   │   ├── sidebar.tsx                    # Report sidebar navigation
│   │   ├── overview.tsx                   # Overview section
│   │   ├── file-tree.tsx                  # File structure tree
│   │   ├── tech-stack.tsx                 # Tech stack visualization
│   │   ├── ai-summary.tsx                 # AI summary section
│   │   ├── architecture.tsx               # Architecture diagrams
│   │   └── health-score.tsx               # Health score display
│   └── shared/
│       ├── url-input.tsx                  # GitHub URL input component
│       ├── token-input.tsx                # Token input component
│       └── loading-spinner.tsx            # Loading animation
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local.example
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `next.config.ts`
- Create: `postcss.config.js`
- Create: `.env.local.example`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/xiatian/Desktop/RepoLens && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select defaults. This creates the base Next.js 14 project with TypeScript and Tailwind.

- [ ] **Step 2: Install core dependencies**

Run:
```bash
npm install octokit tree-sitter tree-sitter-javascript tree-sitter-typescript tree-sitter-python tree-sitter-go tree-sitter-rust openai mermaid recharts lucide-react
```

- [ ] **Step 3: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Then add needed components:
```bash
npx shadcn@latest add button input card badge tabs separator scroll-area tooltip
```

- [ ] **Step 4: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
OPENAI_API_KEY=your_openai_api_key_here
EOF
```

- [ ] **Step 5: Update app/layout.tsx with base layout**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RepoLens - GitHub Repository Analyzer",
  description: "Deep analysis reports for any GitHub repository",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create minimal app/page.tsx placeholder**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">RepoLens</h1>
    </main>
  );
}
```

- [ ] **Step 7: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000, page shows "RepoLens" heading.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with core dependencies"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts with all type definitions**

```typescript
// Repository metadata from GitHub API
export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  defaultBranch: string;
  license: string | null;
  size: number; // KB
  topics: string[];
}

// File tree node
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: FileTreeNode[];
}

// Technology stack
export interface TechStack {
  languages: LanguageInfo[];
  frameworks: FrameworkInfo[];
  packageManager: string | null;
}

export interface LanguageInfo {
  name: string;
  percentage: number;
  color: string;
}

export interface FrameworkInfo {
  name: string;
  version: string | null;
  category: "framework" | "library" | "tool";
}

// AI-generated summary
export interface AISummary {
  introduction: string;
  architecture: string;
  technicalAnalysis: string;
}

// Mermaid diagrams
export interface Diagrams {
  dependencyGraph: string; // Mermaid code
  directoryStructure: string; // Mermaid code
}

// Health score
export interface HealthScore {
  overall: number; // 0-100
  documentation: DimensionScore;
  issueActivity: DimensionScore;
  maintenance: DimensionScore;
}

export interface DimensionScore {
  score: number; // 0-100
  label: string; // "high" | "medium" | "low"
  details: ScoreDetail[];
}

export interface ScoreDetail {
  metric: string;
  value: string | number | boolean;
  points: number;
  maxPoints: number;
}

// Module dependency mapping from Tree-sitter
export interface DependencyMap {
  modules: ModuleInfo[];
  edges: DependencyEdge[];
}

export interface ModuleInfo {
  name: string;
  path: string;
  language: string;
  imports: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "import" | "re-export";
}

// Full analysis report
export interface AnalysisReport {
  id: string;
  meta: RepoMeta;
  structure: FileTreeNode;
  techStack: TechStack;
  summary: AISummary;
  diagrams: Diagrams;
  health: HealthScore;
  analyzedAt: string;
}

// API request/response
export interface AnalyzeRequest {
  url: string;
  token?: string;
}

// Directory pattern recognition
export interface DirectoryPattern {
  path: string;
  purpose: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/types.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts && git commit -m "feat: add type definitions for analysis data structures"
```

---

### Task 3: GitHub API Service

**Files:**
- Create: `lib/github.ts`

- [ ] **Step 1: Create lib/github.ts with Octokit wrapper**

```typescript
import { Octokit } from "octokit";
import { RepoMeta, FileTreeNode } from "./types";

interface GitHubServiceConfig {
  token?: string;
}

class GitHubService {
  private octokit: Octokit;
  private owner: string = "";
  private repo: string = "";

  constructor(config: GitHubServiceConfig = {}) {
    this.octokit = new Octokit({
      auth: config.token || undefined,
    });
  }

  parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(
      /github\.com\/([^/]+)\/([^/]+)/
    );
    if (!match) {
      throw new Error("Invalid GitHub repository URL");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }

  setRepo(url: string): void {
    const { owner, repo } = this.parseRepoUrl(url);
    this.owner = owner;
    this.repo = repo;
  }

  async getRepoMeta(): Promise<RepoMeta> {
    const { data } = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      defaultBranch: data.default_branch,
      license: data.license?.spdx_id || null,
      size: data.size,
      topics: data.topics || [],
    };
  }

  async getFileTree(): Promise<FileTreeNode> {
    const { data } = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    const root: FileTreeNode = {
      name: this.repo,
      path: "",
      type: "dir",
      children: [],
    };

    for (const item of data.tree) {
      if (!item.path) continue;

      const parts = item.path.split("/");
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1 && item.type === "blob";

        if (isFile) {
          current.children = current.children || [];
          current.children.push({
            name: part,
            path: item.path,
            type: "file",
            size: item.size,
          });
        } else {
          current.children = current.children || [];
          let dir = current.children.find(
            (c) => c.name === part && c.type === "dir"
          );
          if (!dir) {
            dir = {
              name: part,
              path: parts.slice(0, i + 1).join("/"),
              type: "dir",
              children: [],
            };
            current.children.push(dir);
          }
          current = dir;
        }
      }
    }

    return root;
  }

  async getFileContent(path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      if ("content" in data && "encoding" in data) {
        return Buffer.from(data.content, data.encoding as BufferEncoding).toString("utf-8");
      }
      return null;
    } catch {
      return null;
    }
  }

  async getRecentCommits(count: number = 30): Promise<{ date: string; author: string }[]> {
    const { data } = await this.octokit.rest.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: count,
    });
    return data.map((c) => ({
      date: c.commit.author?.date || "",
      author: c.commit.author?.name || "",
    }));
  }

  async getIssuesStats(): Promise<{
    openCount: number;
    closedCount: number;
    avgCloseDays: number | null;
    hasLabels: boolean;
    recentlyClosed: boolean;
  }> {
    const [openRes, closedRes] = await Promise.all([
      this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: "open",
        per_page: 1,
      }),
      this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: "closed",
        per_page: 30,
        sort: "updated",
        direction: "desc",
      }),
    ]);

    const openCount = openRes.headers["x-total-count"]
      ? parseInt(openRes.headers["x-total-count"] as string)
      : 0;

    const closedIssues = closedRes.data.filter((i) => !i.pull_request);
    const recentlyClosed = closedIssues.some((i) => {
      const closedAt = new Date(i.closed_at || "");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return closedAt > thirtyDaysAgo;
    });

    const hasLabels = closedIssues.some((i) => (i.labels?.length || 0) > 0);

    let avgCloseDays: number | null = null;
    if (closedIssues.length > 0) {
      const days = closedIssues
        .filter((i) => i.closed_at && i.created_at)
        .map((i) => {
          const created = new Date(i.created_at);
          const closed = new Date(i.closed_at!);
          return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      if (days.length > 0) {
        avgCloseDays = days.reduce((a, b) => a + b, 0) / days.length;
      }
    }

    return {
      openCount,
      closedCount: parseInt(closedRes.headers["x-total-count"] as string) || closedIssues.length,
      avgCloseDays,
      hasLabels,
      recentlyClosed,
    };
  }

  async getContributorsCount(): Promise<number> {
    try {
      const { data } = await this.octokit.rest.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: 1,
      });
      // The total count is in the Link header, but for simplicity count from a small fetch
      const { headers } = await this.octokit.rest.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: 1,
        page: 1,
      });
      const linkHeader = headers.link || "";
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      return lastPageMatch ? parseInt(lastPageMatch[1]) : data.length;
    } catch {
      return 0;
    }
  }

  async getLatestRelease(): Promise<{ date: string; tag: string } | null> {
    try {
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner: this.owner,
        repo: this.repo,
      });
      return { date: data.published_at || "", tag: data.tag_name };
    } catch {
      return null;
    }
  }

  async checkFileExists(path: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export async function createGitHubService(
  url: string,
  token?: string
): Promise<GitHubService> {
  const service = new GitHubService({ token });
  service.setRepo(url);
  return service;
}

export { GitHubService };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/github.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/github.ts && git commit -m "feat: add GitHub API service with Octokit wrapper"
```

---

### Task 4: Scanner Service

**Files:**
- Create: `lib/scanner.ts`

- [ ] **Step 1: Create lib/scanner.ts**

```typescript
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { FileTreeNode, DirectoryPattern } from "./types";

const CONFIG_FILES = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "go.mod",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "pubspec.yaml",
  "mix.exs",
];

const DIRECTORY_PURPOSES: Record<string, string> = {
  src: "Source code",
  lib: "Library code",
  app: "Application code",
  components: "UI components",
  pages: "Page components",
  routes: "Route definitions",
  api: "API handlers",
  services: "Service layer",
  utils: "Utility functions",
  helpers: "Helper functions",
  hooks: "Custom hooks",
  styles: "Style files",
  assets: "Static assets",
  public: "Public assets",
  static: "Static files",
  config: "Configuration",
  scripts: "Build/utility scripts",
  tests: "Test files",
  test: "Test files",
  __tests__: "Test files",
  spec: "Test specifications",
  docs: "Documentation",
  examples: "Example code",
  demo: "Demo code",
  migrations: "Database migrations",
  models: "Data models",
  types: "Type definitions",
  interfaces: "Interface definitions",
  constants: "Constants",
  middleware: "Middleware",
  plugins: "Plugins",
  store: "State management",
  context: "React context",
  providers: "Provider components",
  layouts: "Layout components",
};

export interface ScanResult {
  rootPath: string;
  fileTree: FileTreeNode;
  directoryPatterns: DirectoryPattern[];
  configFiles: Record<string, string>; // filename -> content
  totalFiles: number;
  totalSize: number;
}

export async function cloneRepo(
  url: string,
  owner: string,
  repo: string
): Promise<string> {
  const tmpDir = path.join("/tmp", `repolens-${owner}-${repo}`);

  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  try {
    execSync(`git clone --depth=1 ${url}.git ${tmpDir}`, {
      timeout: 10000,
      stdio: "pipe",
    });
  } catch {
    throw new Error("Repository clone failed or timed out");
  }

  return tmpDir;
}

export function scanDirectory(dirPath: string, basePath: string = ""): FileTreeNode {
  const name = path.basename(dirPath);
  const relativePath = basePath
    ? path.join(basePath, name)
    : name;

  const node: FileTreeNode = {
    name,
    path: relativePath,
    type: "dir",
    children: [],
  };

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Skip hidden and common non-essential directories
  const skipDirs = new Set([
    ".git",
    "node_modules",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".cache",
    "target",
    "vendor",
    ".gradle",
    ".idea",
    ".vscode",
  ]);

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const child = scanDirectory(fullPath, relativePath);
      node.children!.push(child);
    } else {
      const stat = fs.statSync(fullPath);
      node.children!.push({
        name: entry.name,
        path: path.join(relativePath, entry.name),
        type: "file",
        size: stat.size,
      });
    }
  }

  // Sort: directories first, then files, alphabetically
  node.children!.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return node;
}

export function identifyDirectoryPatterns(tree: FileTreeNode): DirectoryPattern[] {
  const patterns: DirectoryPattern[] = [];

  function traverse(node: FileTreeNode) {
    if (node.type === "dir") {
      const purpose = DIRECTORY_PURPOSES[node.name];
      if (purpose) {
        patterns.push({ path: node.path, purpose });
      }
      node.children?.forEach(traverse);
    }
  }

  traverse(tree);
  return patterns;
}

export function extractConfigFiles(
  dirPath: string
): Record<string, string> {
  const configs: Record<string, string> = {};

  for (const filename of CONFIG_FILES) {
    const filePath = path.join(dirPath, filename);
    if (fs.existsSync(filePath)) {
      try {
        configs[filename] = fs.readFileSync(filePath, "utf-8");
      } catch {
        // Skip unreadable files
      }
    }
  }

  return configs;
}

export function countFiles(tree: FileTreeNode): { totalFiles: number; totalSize: number } {
  let totalFiles = 0;
  let totalSize = 0;

  function traverse(node: FileTreeNode) {
    if (node.type === "file") {
      totalFiles++;
      totalSize += node.size || 0;
    }
    node.children?.forEach(traverse);
  }

  traverse(tree);
  return { totalFiles, totalSize };
}

export function cleanupClone(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/scanner.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scanner.ts && git commit -m "feat: add scanner service for repo cloning and file scanning"
```

---

### Task 5: Tree-sitter Parser

**Files:**
- Create: `lib/parser.ts`

- [ ] **Step 1: Create lib/parser.ts**

```typescript
import { DependencyMap, ModuleInfo, DependencyEdge } from "./types";
import fs from "fs";
import path from "path";

// Language detection from file extension
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

// Language-specific import patterns (regex fallback when tree-sitter is unavailable)
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  javascript: [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  typescript: [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  python: [
    /import\s+([a-zA-Z0-9_.]+)/g,
    /from\s+([a-zA-Z0-9_.]+)\s+import/g,
  ],
  go: [
    /"([^"]+)"/g, // Simplified - matches strings in import blocks
  ],
  rust: [
    /use\s+([a-zA-Z0-9_:]+)/g,
  ],
};

const ENTRY_FILES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "main.ts",
  "main.go",
  "main.py",
  "main.rs",
  "app.ts",
  "app.tsx",
  "mod.rs",
  "__init__.py",
  "lib.rs",
];

function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath);
  return EXTENSION_TO_LANGUAGE[ext] || null;
}

function extractImportsWithRegex(
  content: string,
  language: string
): string[] {
  const patterns = IMPORT_PATTERNS[language] || [];
  const imports: string[] = [];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

function isLocalImport(importPath: string): boolean {
  return importPath.startsWith(".") || importPath.startsWith("/");
}

function resolveImportToModule(
  importPath: string,
  fromFile: string,
  allFiles: Set<string>
): string | null {
  // Try exact match
  if (allFiles.has(importPath)) return importPath;

  // Try with extensions
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];
  for (const ext of extensions) {
    if (allFiles.has(importPath + ext)) return importPath + ext;
  }

  // Try index file in directory
  for (const entryFile of ENTRY_FILES) {
    const indexPath = path.join(importPath, entryFile);
    if (allFiles.has(indexPath)) return indexPath;
  }

  return null;
}

export function parseRepository(rootPath: string): DependencyMap {
  const modules: ModuleInfo[] = [];
  const edges: DependencyEdge[] = [];
  const allFiles = new Set<string>();

  // Collect all parseable files
  function collectFiles(dir: string, basePath: string = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const skipDirs = new Set([
      "node_modules", ".git", "dist", "build", ".next",
      "__pycache__", "vendor", "target",
    ]);

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          collectFiles(fullPath, relativePath);
        }
      } else {
        const language = detectLanguage(entry.name);
        if (language) {
          allFiles.add(relativePath);
        }
      }
    }
  }

  collectFiles(rootPath);

  // Parse each file
  for (const filePath of allFiles) {
    const fullPath = path.join(rootPath, filePath);
    const language = detectLanguage(filePath)!;

    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const rawImports = extractImportsWithRegex(content, language);
    const localImports = rawImports.filter(isLocalImport);

    // Resolve local imports to actual module paths
    const resolvedImports: string[] = [];
    for (const imp of localImports) {
      const resolved = resolveImportToModule(imp, filePath, allFiles);
      if (resolved) {
        resolvedImports.push(resolved);
        edges.push({
          from: filePath,
          to: resolved,
          type: "import",
        });
      }
    }

    modules.push({
      name: path.basename(filePath, path.extname(filePath)),
      path: filePath,
      language,
      imports: resolvedImports,
    });
  }

  return { modules, edges };
}

// Parse only entry files and their direct dependencies (for large repos)
export function parseEntryFiles(rootPath: string): DependencyMap {
  const modules: ModuleInfo[] = [];
  const edges: DependencyEdge[] = [];
  const allFiles = new Set<string>();

  // Collect all files for resolution
  function collectFiles(dir: string, basePath: string = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const skipDirs = new Set([
      "node_modules", ".git", "dist", "build", ".next",
      "__pycache__", "vendor", "target",
    ]);

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          collectFiles(fullPath, relativePath);
        }
      } else {
        const language = detectLanguage(entry.name);
        if (language) {
          allFiles.add(relativePath);
        }
      }
    }
  }

  collectFiles(rootPath);

  // Find and parse only entry files
  const parsedPaths = new Set<string>();

  for (const entryFile of ENTRY_FILES) {
    if (allFiles.has(entryFile)) {
      const fullPath = path.join(rootPath, entryFile);
      const language = detectLanguage(entryFile)!;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      const rawImports = extractImportsWithRegex(content, language);
      const localImports = rawImports.filter(isLocalImport);

      const resolvedImports: string[] = [];
      for (const imp of localImports) {
        const resolved = resolveImportToModule(imp, entryFile, allFiles);
        if (resolved) {
          resolvedImports.push(resolved);
          edges.push({ from: entryFile, to: resolved, type: "import" });
        }
      }

      modules.push({
        name: path.basename(entryFile, path.extname(entryFile)),
        path: entryFile,
        language,
        imports: resolvedImports,
      });

      parsedPaths.add(entryFile);
    }
  }

  return { modules, edges };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/parser.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/parser.ts && git commit -m "feat: add Tree-sitter parser with regex fallback for dependency extraction"
```

---

### Task 6: Summary Service (Templates + LLM)

**Files:**
- Create: `lib/summary/templates.ts`
- Create: `lib/summary/llm.ts`

- [ ] **Step 1: Create lib/summary/templates.ts**

```typescript
import {
  RepoMeta,
  FileTreeNode,
  TechStack,
  DependencyMap,
  DirectoryPattern,
  AISummary,
} from "../types";

export function generateIntroduction(
  meta: RepoMeta,
  techStack: TechStack
): string {
  const languageList = techStack.languages
    .slice(0, 3)
    .map((l) => l.name)
    .join(", ");

  const frameworkList = techStack.frameworks
    .filter((f) => f.category === "framework")
    .slice(0, 3)
    .map((f) => f.name)
    .join(", ");

  let intro = `${meta.fullName} is a ${meta.description || "GitHub repository"}. `;
  intro += `The project is primarily written in ${languageList || "multiple languages"}`;

  if (frameworkList) {
    intro += ` and uses ${frameworkList}`;
  }
  intro += `. `;

  if (meta.stars > 0) {
    intro += `It has gained ${meta.stars.toLocaleString()} stars and ${meta.forks.toLocaleString()} forks on GitHub. `;
  }

  if (meta.license) {
    intro += `The project is licensed under ${meta.license}. `;
  }

  return intro.trim();
}

export function generateArchitecture(
  meta: RepoMeta,
  patterns: DirectoryPattern[],
  depMap: DependencyMap
): string {
  let arch = `The repository follows a structured organization with the following key directories:\n\n`;

  for (const pattern of patterns.slice(0, 8)) {
    arch += `- **${pattern.path}**: ${pattern.purpose}\n`;
  }

  const moduleCount = depMap.modules.length;
  const edgeCount = depMap.edges.length;

  if (moduleCount > 0) {
    arch += `\nThe codebase consists of ${moduleCount} modules with ${edgeCount} inter-module dependencies. `;

    // Find most-connected modules
    const incomingEdges = new Map<string, number>();
    for (const edge of depMap.edges) {
      incomingEdges.set(edge.to, (incomingEdges.get(edge.to) || 0) + 1);
    }

    const topModules = Array.from(incomingEdges.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topModules.length > 0) {
      arch += `The most depended-upon modules are: ${topModules.map(([m]) => m).join(", ")}.`;
    }
  }

  return arch;
}

export function generateTechnicalAnalysis(
  meta: RepoMeta,
  techStack: TechStack,
  configFiles: Record<string, string>
): string {
  let analysis = "";

  // Language breakdown
  if (techStack.languages.length > 0) {
    analysis += `**Language Distribution:**\n`;
    for (const lang of techStack.languages) {
      analysis += `- ${lang.name}: ${lang.percentage.toFixed(1)}%\n`;
    }
    analysis += "\n";
  }

  // Framework analysis
  if (techStack.frameworks.length > 0) {
    analysis += `**Key Dependencies:**\n`;
    for (const fw of techStack.frameworks.slice(0, 10)) {
      const version = fw.version ? `@${fw.version}` : "";
      analysis += `- ${fw.name}${version} (${fw.category})\n`;
    }
    analysis += "\n";
  }

  // Package manager
  if (techStack.packageManager) {
    analysis += `**Package Manager:** ${techStack.packageManager}\n\n`;
  }

  return analysis.trim();
}

export function generateBaseSummary(
  meta: RepoMeta,
  fileTree: FileTreeNode,
  techStack: TechStack,
  patterns: DirectoryPattern[],
  depMap: DependencyMap,
  configFiles: Record<string, string>
): AISummary {
  return {
    introduction: generateIntroduction(meta, techStack),
    architecture: generateArchitecture(meta, patterns, depMap),
    technicalAnalysis: generateTechnicalAnalysis(meta, techStack, configFiles),
  };
}
```

- [ ] **Step 2: Create lib/summary/llm.ts**

```typescript
import OpenAI from "openai";
import { AISummary } from "../types";

export async function refineSummary(
  baseSummary: AISummary,
  meta: { owner: string; name: string; description: string | null }
): Promise<AISummary> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return baseSummary;
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `You are a technical writer analyzing a GitHub repository. Refine and enhance the following analysis for the repository "${meta.owner}/${meta.name}".

Repository description: ${meta.description || "No description provided"}

Current introduction:
${baseSummary.introduction}

Current architecture analysis:
${baseSummary.architecture}

Current technical analysis:
${baseSummary.technicalAnalysis}

Please refine each section to be more insightful, professional, and actionable. Keep the same structure but improve clarity, add context where helpful, and make the language more engaging. Return your response as a JSON object with keys: "introduction", "architecture", "technicalAnalysis".`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return baseSummary;

    const refined = JSON.parse(content) as AISummary;
    return {
      introduction: refined.introduction || baseSummary.introduction,
      architecture: refined.architecture || baseSummary.architecture,
      technicalAnalysis: refined.technicalAnalysis || baseSummary.technicalAnalysis,
    };
  } catch {
    // LLM refinement failed, return base summary
    return baseSummary;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/summary/templates.ts lib/summary/llm.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/summary/ && git commit -m "feat: add summary service with rule templates and LLM refinement"
```

---

### Task 7: Diagram Generator

**Files:**
- Create: `lib/diagram.ts`

- [ ] **Step 1: Create lib/diagram.ts**

```typescript
import { DependencyMap, FileTreeNode, Diagrams, DirectoryPattern } from "./types";

export function generateDependencyGraph(depMap: DependencyMap): string {
  if (depMap.modules.length === 0) {
    return "graph LR\n  empty[No module dependencies detected]";
  }

  const lines: string[] = ["graph LR"];

  // Limit to top 30 modules for readability
  const topModules = depMap.modules.slice(0, 30);
  const topModulePaths = new Set(topModules.map((m) => m.path));

  // Add nodes
  for (const mod of topModules) {
    const safeId = sanitizeMermaidId(mod.path);
    const label = mod.name;
    lines.push(`  ${safeId}["${label}"]`);
  }

  // Add edges
  const seen = new Set<string>();
  for (const edge of depMap.edges) {
    if (!topModulePaths.has(edge.from) || !topModulePaths.has(edge.to)) continue;

    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fromId = sanitizeMermaidId(edge.from);
    const toId = sanitizeMermaidId(edge.to);
    lines.push(`  ${fromId} --> ${toId}`);
  }

  return lines.join("\n");
}

export function generateDirectoryStructure(
  tree: FileTreeNode,
  patterns: DirectoryPattern[]
): string {
  const lines: string[] = ["graph TD"];
  const patternMap = new Map(patterns.map((p) => [p.path, p.purpose]));

  function traverse(node: FileTreeNode, parentId: string | null, depth: number) {
    if (depth > 4) return; // Limit depth

    const nodeId = sanitizeMermaidId(node.path || "root");
    const purpose = patternMap.get(node.path);
    const label = purpose ? `${node.name}<br/><small>${purpose}</small>` : node.name;

    lines.push(`  ${nodeId}["${label}"]`);

    if (parentId) {
      lines.push(`  ${parentId} --> ${nodeId}`);
    }

    // Only traverse directories, limit children to first 8
    const children = node.children?.filter((c) => c.type === "dir").slice(0, 8) || [];
    for (const child of children) {
      traverse(child, nodeId, depth + 1);
    }
  }

  traverse(tree, null, 0);
  return lines.join("\n");
}

export function generateDiagrams(
  depMap: DependencyMap,
  tree: FileTreeNode,
  patterns: DirectoryPattern[]
): Diagrams {
  return {
    dependencyGraph: generateDependencyGraph(depMap),
    directoryStructure: generateDirectoryStructure(tree, patterns),
  };
}

function sanitizeMermaidId(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/diagram.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/diagram.ts && git commit -m "feat: add Mermaid diagram generator for dependency and directory graphs"
```

---

### Task 8: Health Score Calculator

**Files:**
- Create: `lib/health.ts`

- [ ] **Step 1: Create lib/health.ts**

```typescript
import { HealthScore, DimensionScore, ScoreDetail } from "./types";
import { GitHubService } from "./github";

export async function calculateHealthScore(
  github: GitHubService,
  readmeContent: string | null
): Promise<HealthScore> {
  const [documentation, issueActivity, maintenance] = await Promise.all([
    calculateDocumentation(github, readmeContent),
    calculateIssueActivity(github),
    calculateMaintenance(github),
  ]);

  const overall = Math.round(
    documentation.score * 0.3 +
    issueActivity.score * 0.35 +
    maintenance.score * 0.35
  );

  return { overall, documentation, issueActivity, maintenance };
}

async function calculateDocumentation(
  github: GitHubService,
  readmeContent: string | null
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  // README length > 500 chars
  const readmeLength = readmeContent?.length || 0;
  const readmePoints = readmeLength > 500 ? 30 : Math.min(30, Math.floor(readmeLength / 17));
  details.push({ metric: "README length", value: readmeLength, points: readmePoints, maxPoints: 30 });
  score += readmePoints;

  // README contains installation instructions
  const hasInstall = readmeContent
    ? /install|setup|getting started|quickstart|usage/i.test(readmeContent)
    : false;
  const installPoints = hasInstall ? 20 : 0;
  details.push({ metric: "Has installation docs", value: hasInstall, points: installPoints, maxPoints: 20 });
  score += installPoints;

  // CONTRIBUTING.md exists
  const hasContributing = await github.checkFileExists("CONTRIBUTING.md");
  const contributingPoints = hasContributing ? 20 : 0;
  details.push({ metric: "CONTRIBUTING.md exists", value: hasContributing, points: contributingPoints, maxPoints: 20 });
  score += contributingPoints;

  // CHANGELOG exists
  const hasChangelog = await github.checkFileExists("CHANGELOG.md") || await github.checkFileExists("CHANGELOG");
  const changelogPoints = hasChangelog ? 15 : 0;
  details.push({ metric: "CHANGELOG exists", value: hasChangelog, points: changelogPoints, maxPoints: 15 });
  score += changelogPoints;

  // Wiki has content (check via repo has_wiki property)
  const hasWiki = false; // Simplified - would need additional API call
  const wikiPoints = hasWiki ? 15 : 0;
  details.push({ metric: "Wiki has content", value: hasWiki, points: wikiPoints, maxPoints: 15 });
  score += wikiPoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

async function calculateIssueActivity(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  const stats = await github.getIssuesStats();

  // Open issues < 50
  const lowIssuesPoints = stats.openCount < 50 ? 25 : Math.max(0, 25 - Math.floor((stats.openCount - 50) / 10));
  details.push({ metric: "Open issues count", value: stats.openCount, points: lowIssuesPoints, maxPoints: 25 });
  score += lowIssuesPoints;

  // Average close time < 7 days
  const avgCloseDays = stats.avgCloseDays;
  const closeTimePoints = avgCloseDays !== null
    ? (avgCloseDays < 7 ? 25 : Math.max(0, 25 - Math.floor((avgCloseDays - 7) / 3)))
    : 0;
  details.push({ metric: "Avg issue close time (days)", value: avgCloseDays ?? "N/A", points: closeTimePoints, maxPoints: 25 });
  score += closeTimePoints;

  // Issues have labels
  const labelPoints = stats.hasLabels ? 20 : 0;
  details.push({ metric: "Issues use labels", value: stats.hasLabels, points: labelPoints, maxPoints: 20 });
  score += labelPoints;

  // Recently closed issues
  const recentPoints = stats.recentlyClosed ? 15 : 0;
  details.push({ metric: "Issues closed in last 30 days", value: stats.recentlyClosed, points: recentPoints, maxPoints: 15 });
  score += recentPoints;

  // Issue/PR ratio reasonable (simplified - always give partial credit)
  const ratioPoints = 10;
  details.push({ metric: "Issue/PR ratio", value: "reasonable", points: ratioPoints, maxPoints: 15 });
  score += ratioPoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

async function calculateMaintenance(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  const [commits, contributors, latestRelease] = await Promise.all([
    github.getRecentCommits(30),
    github.getContributorsCount(),
    github.getLatestRelease(),
  ]);

  // Recent commit < 30 days
  const lastCommitDate = commits[0]?.date;
  const daysSinceLastCommit = lastCommitDate
    ? (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const recentCommitPoints = daysSinceLastCommit < 30 ? 25 : Math.max(0, 25 - Math.floor((daysSinceLastCommit - 30) / 15));
  details.push({ metric: "Days since last commit", value: Math.round(daysSinceLastCommit), points: recentCommitPoints, maxPoints: 25 });
  score += recentCommitPoints;

  // Monthly commits > 10
  const monthlyCommits = commits.filter((c) => {
    const date = new Date(c.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;
  const commitFreqPoints = monthlyCommits > 10 ? 25 : Math.min(25, monthlyCommits * 2.5);
  details.push({ metric: "Commits in last 30 days", value: monthlyCommits, points: Math.round(commitFreqPoints), maxPoints: 25 });
  score += Math.round(commitFreqPoints);

  // Contributors > 5
  const contributorPoints = contributors > 5 ? 20 : Math.min(20, contributors * 4);
  details.push({ metric: "Contributors", value: contributors, points: contributorPoints, maxPoints: 20 });
  score += contributorPoints;

  // Recent release
  const hasRecentRelease = latestRelease
    ? (Date.now() - new Date(latestRelease.date).getTime()) / (1000 * 60 * 60 * 24 * 180) < 1
    : false;
  const releasePoints = hasRecentRelease ? 15 : 0;
  details.push({ metric: "Release in last 6 months", value: hasRecentRelease, points: releasePoints, maxPoints: 15 });
  score += releasePoints;

  // PR merge time (simplified - give partial credit)
  const prMergePoints = 10;
  details.push({ metric: "PR merge time", value: "reasonable", points: prMergePoints, maxPoints: 15 });
  score += prMergePoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

function scoreToLabel(score: number): string {
  if (score >= 71) return "healthy";
  if (score >= 41) return "moderate";
  return "at-risk";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/health.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/health.ts && git commit -m "feat: add health score calculator with three-dimension scoring"
```

---

### Task 9: Analysis Orchestrator

**Files:**
- Create: `lib/analyzer.ts`

- [ ] **Step 1: Create lib/analyzer.ts**

```typescript
import { AnalysisReport, TechStack, LanguageInfo, FrameworkInfo } from "./types";
import { createGitHubService } from "./github";
import { cloneRepo, scanDirectory, identifyDirectoryPatterns, extractConfigFiles, countFiles, cleanupClone, ScanResult } from "./scanner";
import { parseRepository, parseEntryFiles } from "./parser";
import { generateBaseSummary } from "./summary/templates";
import { refineSummary } from "./summary/llm";
import { generateDiagrams } from "./diagram";
import { calculateHealthScore } from "./health";

const MAX_REPO_SIZE_KB = 50 * 1024; // 50MB
const MAX_FILE_COUNT = 10000;

function identifyTechStack(
  configFiles: Record<string, string>,
  languages: string[]
): TechStack {
  const langInfos: LanguageInfo[] = [];
  const frameworks: FrameworkInfo[] = [];
  let packageManager: string | null = null;

  // Parse languages from GitHub (simplified - use language percentages)
  const totalLangs = languages.length || 1;
  languages.forEach((lang, i) => {
    langInfos.push({
      name: lang,
      percentage: 100 / totalLangs, // Simplified equal distribution
      color: getLanguageColor(lang),
    });
  });

  // Parse package.json
  if (configFiles["package.json"]) {
    try {
      const pkg = JSON.parse(configFiles["package.json"]);
      packageManager = "npm";

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        const v = (version as string).replace(/^[\^~>=<]*/, "");
        const category = categorizeNpmPackage(name);
        frameworks.push({ name, version: v || null, category });
      }
    } catch {
      // Invalid JSON
    }
  }

  // Parse pyproject.toml (simplified)
  if (configFiles["pyproject.toml"]) {
    packageManager = "pip";
  }

  // Parse go.mod (simplified)
  if (configFiles["go.mod"]) {
    packageManager = "go modules";
  }

  // Parse Cargo.toml (simplified)
  if (configFiles["Cargo.toml"]) {
    packageManager = "cargo";
  }

  // Sort languages by percentage descending
  langInfos.sort((a, b) => b.percentage - a.percentage);

  return { languages: langInfos, frameworks, packageManager };
}

function categorizeNpmPackage(name: string): "framework" | "library" | "tool" {
  const frameworks = new Set([
    "react", "vue", "angular", "next", "nuxt", "svelte", "express",
    "fastify", "nestjs", "koa", "hapi", "remix", "astro", "solid-js",
  ]);
  const tools = new Set([
    "typescript", "eslint", "prettier", "jest", "vitest", "webpack",
    "vite", "rollup", "esbuild", "babel", "postcss", "tailwindcss",
  ]);

  if (frameworks.has(name)) return "framework";
  if (tools.has(name)) return "tool";
  return "library";
}

function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
  };
  return colors[lang] || "#8b8b8b";
}

export async function analyzeRepository(
  url: string,
  token?: string
): Promise<AnalysisReport> {
  const github = await createGitHubService(url, token);

  // Step 1: Get repo metadata
  const meta = await github.getRepoMeta();

  // Step 2: Get README content
  const readmeContent = await github.getFileContent("README.md");

  // Step 3: Get GitHub language data
  let languages: string[] = [];
  try {
    const { data } = await (github as any).octokit.rest.repos.listLanguages({
      owner: meta.owner,
      repo: meta.name,
    });
    const totalBytes = Object.values(data).reduce((a: number, b: any) => a + b, 0);
    languages = Object.entries(data)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([lang, bytes]: [string, any]) => lang);
  } catch {
    languages = meta.language ? [meta.language] : [];
  }

  // Step 4: Decide analysis depth based on repo size
  let scanResult: ScanResult | null = null;
  let depMap;
  let configFiles: Record<string, string> = {};
  let patterns: import("./types").DirectoryPattern[] = [];

  if (meta.size <= MAX_REPO_SIZE_KB) {
    // Full analysis: clone and scan
    try {
      const clonePath = await cloneRepo(url, meta.owner, meta.name);
      try {
        const fileTree = scanDirectory(clonePath, meta.name);
        const fileStats = countFiles(fileTree);

        if (fileStats.totalFiles <= MAX_FILE_COUNT) {
          depMap = parseRepository(clonePath);
        } else {
          depMap = parseEntryFiles(clonePath);
        }

        patterns = identifyDirectoryPatterns(fileTree);
        configFiles = extractConfigFiles(clonePath);
        scanResult = { rootPath: clonePath, fileTree, directoryPatterns: patterns, configFiles, totalFiles: fileStats.totalFiles, totalSize: fileStats.totalSize };
      } finally {
        cleanupClone(clonePath);
      }
    } catch {
      // Clone failed, fall back to API-only
      depMap = { modules: [], edges: [] };
    }
  } else {
    // Large repo: API-only analysis
    depMap = { modules: [], edges: [] };
  }

  // Step 5: Get file tree from GitHub API (fallback or supplement)
  let fileTree;
  if (scanResult) {
    fileTree = scanResult.fileTree;
  } else {
    fileTree = await github.getFileTree();
  }

  // Step 6: Identify tech stack
  const techStack = identifyTechStack(configFiles, languages);

  // Step 7: Generate base summary
  const baseSummary = generateBaseSummary(
    meta,
    fileTree,
    techStack,
    patterns,
    depMap,
    configFiles
  );

  // Step 8: Refine with LLM
  const summary = await refineSummary(baseSummary, {
    owner: meta.owner,
    name: meta.name,
    description: meta.description,
  });

  // Step 9: Generate diagrams
  const diagrams = generateDiagrams(depMap, fileTree, patterns);

  // Step 10: Calculate health score
  const health = await calculateHealthScore(github, readmeContent);

  // Build report
  const reportId = `${meta.owner}/${meta.name}:${meta.defaultBranch}`;

  return {
    id: reportId,
    meta,
    structure: fileTree,
    techStack,
    summary,
    diagrams,
    health,
    analyzedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/analyzer.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analyzer.ts && git commit -m "feat: add analysis orchestrator that coordinates all services"
```

---

### Task 10: API Routes

**Files:**
- Create: `app/api/analyze/route.ts`
- Create: `app/api/github/route.ts`

- [ ] **Step 1: Create app/api/analyze/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { analyzeRepository } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/types";

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { url, token } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(url.replace(/\.git$/, ""))) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL format" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${url}:${token ? "auth" : "anon"}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Analyze
    const report = await analyzeRepository(url, token);

    // Cache result
    cache.set(cacheKey, { data: report, timestamp: Date.now() });

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Analysis failed:", error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: "Repository not found. It may be private - try adding a GitHub token." },
        { status: 404 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Try adding a GitHub token or wait a bit." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create app/api/github/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = request.nextUrl.searchParams.get("token");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token || undefined });
    const { data } = await octokit.rest.repos.get({
      owner: match[1],
      repo: match[2].replace(/\.git$/, ""),
    });

    return NextResponse.json({
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      isPrivate: data.private,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch repository info" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/ && git commit -m "feat: add API routes for analysis and GitHub proxy"
```

---

### Task 11: Shared Components

**Files:**
- Create: `components/shared/url-input.tsx`
- Create: `components/shared/token-input.tsx`
- Create: `components/shared/loading-spinner.tsx`

- [ ] **Step 1: Create components/shared/url-input.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <Input
        type="url"
        placeholder="https://github.com/owner/repo"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={!url.trim() || isLoading}>
        {isLoading ? "Analyzing..." : "Analyze"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create components/shared/token-input.tsx**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TokenInput({ value, onChange }: TokenInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2 w-full max-w-2xl">
      <Input
        type={show ? "text" : "password"}
        placeholder="GitHub Token (optional, for private repos & higher rate limits)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground p-2"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create components/shared/loading-spinner.tsx**

```tsx
export function LoadingSpinner({ text = "Analyzing repository..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/shared/ && git commit -m "feat: add shared UI components (URL input, token input, loading spinner)"
```

---

### Task 12: Report Components

**Files:**
- Create: `components/report/sidebar.tsx`
- Create: `components/report/overview.tsx`
- Create: `components/report/file-tree.tsx`
- Create: `components/report/tech-stack.tsx`
- Create: `components/report/ai-summary.tsx`
- Create: `components/report/architecture.tsx`
- Create: `components/report/health-score.tsx`

- [ ] **Step 1: Create components/report/sidebar.tsx**

```tsx
"use client";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "structure", label: "File Structure" },
  { id: "techstack", label: "Tech Stack" },
  { id: "summary", label: "AI Summary" },
  { id: "architecture", label: "Architecture" },
  { id: "health", label: "Health Score" },
] as const;

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="w-48 shrink-0 border-r bg-muted/30">
      <div className="sticky top-0 p-4 space-y-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              activeSection === section.id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create components/report/overview.tsx**

```tsx
import { RepoMeta, HealthScore, TechStack } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface OverviewProps {
  meta: RepoMeta;
  health: HealthScore;
  techStack: TechStack;
}

export function Overview({ meta, health, techStack }: OverviewProps) {
  const scoreColor =
    health.overall >= 71
      ? "text-green-500"
      : health.overall >= 41
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{meta.fullName}</h2>
        {meta.description && (
          <p className="text-muted-foreground mt-1">{meta.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">⭐ {meta.stars.toLocaleString()}</span>
        <span className="flex items-center gap-1">🍴 {meta.forks.toLocaleString()}</span>
        <span className="flex items-center gap-1">📋 {meta.openIssues} issues</span>
        {meta.license && (
          <span className="flex items-center gap-1">📄 {meta.license}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={scoreColor}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <p className="font-medium">Health Score</p>
          <p className="text-sm text-muted-foreground">
            {health.overall >= 71 ? "Healthy" : health.overall >= 41 ? "Moderate" : "At Risk"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Tech Stack</h3>
        <div className="flex flex-wrap gap-1.5">
          {techStack.languages.map((lang) => (
            <Badge key={lang.name} variant="secondary">
              {lang.name} {lang.percentage.toFixed(0)}%
            </Badge>
          ))}
          {techStack.frameworks
            .filter((f) => f.category === "framework")
            .slice(0, 5)
            .map((fw) => (
              <Badge key={fw.name} variant="outline">
                {fw.name}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create components/report/file-tree.tsx**

```tsx
"use client";

import { useState } from "react";
import { FileTreeNode } from "@/lib/types";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  tree: FileTreeNode;
}

export function FileTree({ tree }: FileTreeProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold mb-4">File Structure</h2>
      <div className="font-mono text-sm">
        <TreeNode node={tree} depth={0} />
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "dir";

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1 py-0.5 px-1 rounded hover:bg-muted w-full text-left",
            depth === 0 && "font-semibold"
          )}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} className="text-blue-500 shrink-0" />
          <span>{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 py-0.5 px-1"
      style={{ paddingLeft: `${depth * 16 + 20}px` }}
    >
      <File size={14} className="text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{node.name}</span>
      {node.size && (
        <span className="text-xs text-muted-foreground ml-auto">
          {formatSize(node.size)}
        </span>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
```

- [ ] **Step 4: Create components/report/tech-stack.tsx**

```tsx
import { TechStack as TechStackType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface TechStackProps {
  techStack: TechStackType;
}

export function TechStackView({ techStack }: TechStackProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Tech Stack</h2>

      {/* Language distribution */}
      <div>
        <h3 className="text-sm font-medium mb-3">Languages</h3>
        <div className="space-y-2">
          {techStack.languages.map((lang) => (
            <div key={lang.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: lang.color }}
              />
              <span className="text-sm w-24">{lang.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${lang.percentage}%`,
                    backgroundColor: lang.color,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {lang.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Frameworks & Libraries */}
      {techStack.frameworks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Frameworks & Libraries</h3>
          <div className="flex flex-wrap gap-1.5">
            {techStack.frameworks.map((fw) => (
              <Badge
                key={fw.name}
                variant={fw.category === "framework" ? "default" : "secondary"}
              >
                {fw.name}
                {fw.version && (
                  <span className="text-xs opacity-70 ml-1">v{fw.version}</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Package Manager */}
      {techStack.packageManager && (
        <div>
          <h3 className="text-sm font-medium mb-1">Package Manager</h3>
          <p className="text-sm text-muted-foreground">{techStack.packageManager}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create components/report/ai-summary.tsx**

```tsx
import { AISummary } from "@/lib/types";

interface AISummaryProps {
  summary: AISummary;
}

export function AISummaryView({ summary }: AISummaryProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">AI Summary</h2>

      <div>
        <h3 className="text-lg font-semibold mb-2">Project Introduction</h3>
        <p className="text-muted-foreground leading-relaxed">
          {summary.introduction}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Architecture</h3>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.architecture}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Technical Analysis</h3>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.technicalAnalysis}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create components/report/architecture.tsx**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Diagrams } from "@/lib/types";

interface ArchitectureProps {
  diagrams: Diagrams;
}

export function Architecture({ diagrams }: ArchitectureProps) {
  const [activeTab, setActiveTab] = useState<"dependency" | "directory">("dependency");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderDiagram = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
      });

      const code = activeTab === "dependency"
        ? diagrams.dependencyGraph
        : diagrams.directoryStructure;

      const container = containerRef.current!;
      container.innerHTML = "";

      try {
        const { svg } = await mermaid.render(
          `mermaid-${activeTab}-${Date.now()}`,
          code
        );
        container.innerHTML = svg;
      } catch {
        container.innerHTML = `<p class="text-muted-foreground text-sm">Failed to render diagram</p><pre class="text-xs mt-2 p-2 bg-muted rounded">${code}</pre>`;
      }
    };

    renderDiagram();
  }, [activeTab, diagrams]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Architecture Diagrams</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("dependency")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "dependency"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Dependency Graph
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "directory"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Directory Structure
        </button>
      </div>

      <div
        ref={containerRef}
        className="border rounded-lg p-4 overflow-auto bg-white min-h-[300px]"
      />
    </div>
  );
}
```

- [ ] **Step 7: Create components/report/health-score.tsx**

```tsx
import { HealthScore as HealthScoreType } from "@/lib/types";

interface HealthScoreProps {
  health: HealthScoreType;
}

export function HealthScoreView({ health }: HealthScoreProps) {
  const dimensions = [
    { key: "documentation", label: "Documentation Quality", data: health.documentation },
    { key: "issueActivity", label: "Issue Activity", data: health.issueActivity },
    { key: "maintenance", label: "Maintenance", data: health.maintenance },
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Health Score</h2>

      {/* Overall score */}
      <div className="flex items-center gap-6 p-4 border rounded-lg">
        <div className="relative h-28 w-28">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={getScoreColor(health.overall)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(health.overall)}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Overall Health</h3>
          <p className="text-sm text-muted-foreground">
            {health.overall >= 71
              ? "This project is in good health with active maintenance and good documentation."
              : health.overall >= 41
              ? "This project has moderate health. Some areas could use improvement."
              : "This project may have maintenance or documentation issues."}
          </p>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="grid gap-4">
        {dimensions.map(({ key, label, data }) => (
          <div key={key} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{label}</h4>
              <span className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                {data.score}
              </span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getScoreBg(data.score)}`}
                style={{ width: `${data.score}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.details.map((detail, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{detail.metric}</span>
                  <span>
                    {typeof detail.value === "boolean"
                      ? detail.value ? "Yes" : "No"
                      : String(detail.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 71) return "text-green-500";
  if (score >= 41) return "text-yellow-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 71) return "bg-green-500";
  if (score >= 41) return "bg-yellow-500";
  return "bg-red-500";
}
```

- [ ] **Step 8: Commit**

```bash
git add components/report/ && git commit -m "feat: add all report section components"
```

---

### Task 13: Pages

**Files:**
- Modify: `app/page.tsx`
- Create: `app/analyze/page.tsx`
- Create: `app/report/[id]/page.tsx`

- [ ] **Step 1: Update app/page.tsx with home page**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/shared/url-input";
import { TokenInput } from "@/components/shared/token-input";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: token || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setIsLoading(false);
        return;
      }

      // Store result in sessionStorage and navigate
      sessionStorage.setItem(`report-${data.id}`, JSON.stringify(data));
      router.push(`/report/${encodeURIComponent(data.id)}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight">RepoLens</h1>
        <p className="text-muted-foreground text-lg">
          Deep analysis for any GitHub repository
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
        <TokenInput value={token} onChange={setToken} />
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-4 py-2 rounded-md max-w-2xl">
          {error}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Create app/analyze/page.tsx**

```tsx
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function AnalyzePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <LoadingSpinner text="Analyzing repository... This may take a moment." />
    </main>
  );
}
```

- [ ] **Step 3: Create app/report/[id]/page.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/report/sidebar";
import { Overview } from "@/components/report/overview";
import { FileTree } from "@/components/report/file-tree";
import { TechStackView } from "@/components/report/tech-stack";
import { AISummaryView } from "@/components/report/ai-summary";
import { Architecture } from "@/components/report/architecture";
import { HealthScoreView } from "@/components/report/health-score";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AnalysisReport } from "@/lib/types";

export default function ReportPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get from sessionStorage first
    const cached = sessionStorage.getItem(`report-${id}`);
    if (cached) {
      try {
        setReport(JSON.parse(cached));
        return;
      } catch {
        // Invalid cache
      }
    }

    // If not in cache, re-fetch
    const [owner, repoAndBranch] = id.split("/");
    const [repo] = repoAndBranch.split(":");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://github.com/${owner}/${repo}` }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReport(data);
          sessionStorage.setItem(`report-${id}`, JSON.stringify(data));
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <a href="/" className="text-primary underline">
            Try again
          </a>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <Overview meta={report.meta} health={report.health} techStack={report.techStack} />;
      case "structure":
        return <FileTree tree={report.structure} />;
      case "techstack":
        return <TechStackView techStack={report.techStack} />;
      case "summary":
        return <AISummaryView summary={report.summary} />;
      case "architecture":
        return <Architecture diagrams={report.diagrams} />;
      case "health":
        return <HealthScoreView health={report.health} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="font-bold text-lg">RepoLens</a>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm">{report.meta.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sessionStorage.removeItem(`report-${id}`);
              window.location.href = "/";
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            New Analysis
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-53px)]">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify the app builds**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/ && git commit -m "feat: add home, analyze, and report pages with full navigation"
```

---

### Task 14: Integration Testing & Polish

**Files:**
- Modify: various files for bug fixes

- [ ] **Step 1: Start dev server and test the full flow**

Run:
```bash
npm run dev
```

Test flow:
1. Open http://localhost:3000
2. Enter a small public repo URL (e.g., `https://github.com/octocat/Hello-World`)
3. Click Analyze
4. Verify report page loads with all sections
5. Click through each sidebar section
6. Verify Mermaid diagrams render

- [ ] **Step 2: Fix any TypeScript errors**

Run:
```bash
npx tsc --noEmit
```

Fix any errors found.

- [ ] **Step 3: Fix any ESLint issues**

Run:
```bash
npm run lint
```

Fix any issues found.

- [ ] **Step 4: Verify production build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve integration issues and polish"
```

---

### Task 15: Final Verification & Documentation

- [ ] **Step 1: Create .gitignore entries if missing**

Verify `.gitignore` includes:
```
.env.local
.superpowers/
node_modules/
.next/
```

- [ ] **Step 2: Final build check**

Run:
```bash
npm run build
```

Expected: Clean build with no warnings.

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "chore: final cleanup and verification"
```

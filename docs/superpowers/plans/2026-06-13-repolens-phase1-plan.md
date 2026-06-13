# RepoLens Phase 1: Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 Critical issues — remove git clone dependency, add Error Boundaries, fix Token security, optimize parallel execution, and ensure Vercel compatibility.

**Architecture:** Replace git clone with pure GitHub API mode. Restructure analyzer to parallelize independent operations. Add Next.js error boundaries and secure token handling.

**Tech Stack:** Next.js 16, Octokit, TypeScript, shadcn/ui

---

## File Structure

```
lib/
├── config.ts              # NEW: Centralized configuration constants
├── logger.ts              # NEW: Lightweight structured logger
├── constants.ts           # NEW: Shared constants (SKIP_DIRS, etc.)
├── types.ts               # MODIFY: Add PipelineProgress type
├── github.ts              # MODIFY: Constructor takes owner/repo, add listLanguages, getMultipleFiles
├── scanner.ts             # REWRITE: Pure API mode, no git clone
├── parser.ts              # REWRITE: Accept file contents map instead of rootPath
├── analyzer.ts            # REWRITE: Pipeline with parallel phases
├── health.ts              # MODIFY: Fix fake scores, normalize
├── diagram.ts             # NO CHANGE in Phase 1
├── summary/
│   ├── templates.ts       # MODIFY: Minor adjustments for new data flow
│   └── llm.ts             # NO CHANGE in Phase 1
app/
├── error.tsx              # NEW: Global error boundary
├── global-error.tsx       # NEW: Root layout error boundary
├── not-found.tsx          # NEW: Custom 404 page
├── page.tsx               # MODIFY: Remove token from GET, improve error handling
├── report/[id]/
│   ├── error.tsx          # NEW: Report error boundary
│   └── page.tsx           # MODIFY: Better error recovery
├── api/
│   ├── analyze/
│   │   └── route.ts       # REWRITE: SSE streaming, secure token handling
│   └── github/
│       └── route.ts       # DELETE: Merged into /api/analyze
```

---

### Task 1: Create lib/config.ts — Centralized Configuration

**Files:**
- Create: `lib/config.ts`

- [ ] **Step 1: Create lib/config.ts**

```typescript
export const ANALYSIS_CONFIG = {
  // Repository size limits
  maxRepoSizeKB: 50 * 1024, // 50MB
  maxFileCount: 10000,
  maxFilesToParse: 200,

  // Timeouts
  githubApiTimeout: 10000, // 10s
  llmTimeout: 15000, // 15s

  // Cache
  cacheTTL: 60 * 60 * 1000, // 1 hour
  maxCacheEntries: 50,

  // Rate limiting
  rateLimitAnon: 10, // per hour
  rateLimitAuth: 30, // per hour

  // Health score weights
  healthWeights: {
    documentation: 0.3,
    issueActivity: 0.35,
    maintenance: 0.35,
  } as const,

  // Health score thresholds
  healthThresholds: {
    readmeLength: 500,
    openIssuesLow: 50,
    avgCloseDaysGood: 7,
    recentCommitDays: 30,
    monthlyCommitsGood: 10,
    contributorsGood: 5,
    releaseMonths: 6,
  } as const,

  // Diagram limits
  maxModulesInGraph: 30,
  maxDirsInStructure: 8,
  maxTreeDepth: 4,

  // Pipeline progress labels
  progressLabels: {
    metadata: "Fetching repository metadata...",
    structure: "Scanning file structure...",
    analysis: "Analyzing tech stack and dependencies...",
    report: "Generating report...",
  } as const,
} as const;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/config.ts && git commit -m "feat: add centralized configuration constants"
```

---

### Task 2: Create lib/logger.ts — Structured Logger

**Files:**
- Create: `lib/logger.ts`

- [ ] **Step 1: Create lib/logger.ts**

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      data,
      timestamp: new Date().toISOString(),
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    switch (level) {
      case "error":
        console.error(prefix, message, data || "");
        break;
      case "warn":
        console.warn(prefix, message, data || "");
        break;
      case "info":
        console.info(prefix, message, data || "");
        break;
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(prefix, message, data || "");
        }
        break;
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/logger.ts && git commit -m "feat: add structured logger"
```

---

### Task 3: Create lib/constants.ts — Shared Constants

**Files:**
- Create: `lib/constants.ts`

- [ ] **Step 1: Create lib/constants.ts**

```typescript
// Directories to skip when scanning/parsing repositories
export const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  "dist",
  "build",
  ".cache",
  "target",
  "vendor",
  ".gradle",
  ".idea",
  ".vscode",
  ".cargo",
  "bower_components",
  ".tox",
  ".mypy_cache",
  ".pytest_cache",
  ".hg",
  ".svn",
]);

// Dotfiles that should NOT be skipped (meaningful config files)
export const ALLOWED_DOTFILES = new Set([
  ".env.example",
  ".eslintrc.js",
  ".eslintrc.json",
  ".eslintrc.cjs",
  ".prettierrc",
  ".prettierrc.js",
  ".prettierrc.json",
  ".babelrc",
  ".editorconfig",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  ".python-version",
  ".rubocop.yml",
  ".rspec",
]);

// Config files to extract for tech stack identification
export const CONFIG_FILES = [
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
] as const;

// Directory purpose mapping
export const DIRECTORY_PURPOSES: Record<string, string> = {
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
} as const;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/constants.ts && git commit -m "feat: add shared constants for skip dirs and directory purposes"
```

---

### Task 4: Rewrite lib/github.ts — Secure, Stateless Service

**Files:**
- Modify: `lib/github.ts`

- [ ] **Step 1: Rewrite lib/github.ts**

```typescript
import { Octokit } from "octokit";
import { RepoMeta, FileTreeNode } from "./types";
import { createLogger } from "./logger";

const logger = createLogger("github");

interface GitHubServiceConfig {
  owner: string;
  repo: string;
  token?: string;
}

class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubServiceConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.octokit = new Octokit({
      auth: config.token || undefined,
    });
  }

  static parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error("Invalid GitHub repository URL");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "").replace(/\/$/, "") };
  }

  static fromUrl(url: string, token?: string): GitHubService {
    const { owner, repo } = GitHubService.parseRepoUrl(url);
    return new GitHubService({ owner, repo, token });
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

  async listLanguages(): Promise<Record<string, number>> {
    try {
      const { data } = await this.octokit.rest.repos.listLanguages({
        owner: this.owner,
        repo: this.repo,
      });
      return data as Record<string, number>;
    } catch (error) {
      logger.error("Failed to list languages", { error: String(error) });
      return {};
    }
  }

  async getFileTree(): Promise<FileTreeNode> {
    const { data } = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    if (data.truncated) {
      logger.warn("File tree was truncated by GitHub API", {
        owner: this.owner,
        repo: this.repo,
      });
    }

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
    } catch (error) {
      logger.debug("File not found", { path, error: String(error) });
      return null;
    }
  }

  async getMultipleFiles(paths: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    const promises = paths.map(async (path) => {
      results[path] = await this.getFileContent(path);
    });
    await Promise.all(promises);
    return results;
  }

  async getRecentCommits(count: number = 30): Promise<{ date: string; author: string }[]> {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: count,
      });
      return data.map((c) => ({
        date: c.commit.author?.date || "",
        author: c.commit.author?.name || "",
      }));
    } catch (error) {
      logger.error("Failed to get recent commits", { error: String(error) });
      return [];
    }
  }

  async getIssuesStats(): Promise<{
    openCount: number;
    closedCount: number;
    avgCloseDays: number | null;
    hasLabels: boolean;
    recentlyClosed: boolean;
  }> {
    try {
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
    } catch (error) {
      logger.error("Failed to get issues stats", { error: String(error) });
      return { openCount: 0, closedCount: 0, avgCloseDays: null, hasLabels: false, recentlyClosed: false };
    }
  }

  async getContributorsCount(): Promise<number> {
    try {
      const { headers } = await this.octokit.rest.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: 1,
        page: 1,
      });
      const linkHeader = headers.link || "";
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      return lastPageMatch ? parseInt(lastPageMatch[1]) : 1;
    } catch (error) {
      logger.error("Failed to get contributors count", { error: String(error) });
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
    } catch (error) {
      logger.debug("No latest release found", { error: String(error) });
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

  async checkMultipleFilesExist(paths: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      paths.map(async (path) => {
        results[path] = await this.checkFileExists(path);
      })
    );
    return results;
  }
}

export { GitHubService };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit lib/github.ts
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/github.ts && git commit -m "refactor: rewrite GitHubService as stateless with owner/repo in constructor, add listLanguages and getMultipleFiles"
```

---

### Task 5: Rewrite lib/scanner.ts — Pure API Mode

**Files:**
- Modify: `lib/scanner.ts`

- [ ] **Step 1: Rewrite lib/scanner.ts**

```typescript
import { FileTreeNode, DirectoryPattern } from "./types";
import { SKIP_DIRS, ALLOWED_DOTFILES, CONFIG_FILES, DIRECTORY_PURPOSES } from "./constants";
import { createLogger } from "./logger";

const logger = createLogger("scanner");

export interface ScanResult {
  fileTree: FileTreeNode;
  directoryPatterns: DirectoryPattern[];
  configFiles: Record<string, string>;
  totalFiles: number;
  totalSize: number;
}

export function buildFileTreeFromGitHub(tree: FileTreeNode): FileTreeNode {
  return tree;
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

export function extractConfigFileNames(tree: FileTreeNode): string[] {
  const found: string[] = [];

  function traverse(node: FileTreeNode) {
    if (node.type === "file" && CONFIG_FILES.includes(node.name as typeof CONFIG_FILES[number])) {
      found.push(node.path);
    }
    node.children?.forEach(traverse);
  }

  traverse(tree);
  return found;
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

export function collectParseableFilePaths(tree: FileTreeNode): string[] {
  const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs"]);
  const paths: string[] = [];

  function traverse(node: FileTreeNode) {
    if (node.type === "dir") {
      if (SKIP_DIRS.has(node.name)) return;
      if (node.name.startsWith(".") && !ALLOWED_DOTFILES.has(node.name)) return;
      node.children?.forEach(traverse);
    } else {
      const ext = node.path.substring(node.path.lastIndexOf("."));
      if (EXTENSIONS.has(ext)) {
        paths.push(node.path);
      }
    }
  }

  traverse(tree);
  return paths;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit lib/scanner.ts
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/scanner.ts && git commit -m "refactor: rewrite scanner as pure API mode, remove git clone"
```

---

### Task 6: Rewrite lib/parser.ts — Accept File Contents Map

**Files:**
- Modify: `lib/parser.ts`

- [ ] **Step 1: Rewrite lib/parser.ts**

```typescript
import { DependencyMap, ModuleInfo, DependencyEdge } from "./types";
import { SKIP_DIRS, ALLOWED_DOTFILES } from "./constants";
import path from "path";

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  javascript: [
    /import\s+.*?from\s+['"]([^'"]+)['"]/,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
  ],
  typescript: [
    /import\s+.*?from\s+['"]([^'"]+)['"]/,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
  ],
  python: [
    /import\s+([a-zA-Z0-9_.]+)/,
    /from\s+([a-zA-Z0-9_.]+)\s+import/,
  ],
  go: [
    /import\s+(?:\([\s\S]*?"([^"]+)"[\s\S]*?\)|\s*"([^"]+)")/,
  ],
  rust: [
    /use\s+([a-zA-Z0-9_:]+)/,
  ],
};

function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath);
  return EXTENSION_TO_LANGUAGE[ext] || null;
}

function extractImports(content: string, language: string): string[] {
  const patterns = IMPORT_PATTERNS[language] || [];
  const imports: string[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, "g");
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Go pattern has two capture groups
      const importPath = match[1] || match[2];
      if (importPath) {
        imports.push(importPath);
      }
    }
  }

  return imports;
}

function isLocalImport(importPath: string): boolean {
  return importPath.startsWith(".") || importPath.startsWith("/");
}

function resolveImportToModule(
  importPath: string,
  allFilePaths: Set<string>
): string | null {
  if (allFilePaths.has(importPath)) return importPath;

  const extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];
  for (const ext of extensions) {
    if (allFilePaths.has(importPath + ext)) return importPath + ext;
  }

  const entryFiles = ["index.ts", "index.tsx", "index.js", "index.jsx", "main.ts", "main.go", "main.py", "main.rs", "mod.rs", "__init__.py", "lib.rs"];
  for (const entryFile of entryFiles) {
    const indexPath = path.join(importPath, entryFile);
    if (allFilePaths.has(indexPath)) return indexPath;
  }

  return null;
}

export function parseDependencies(
  fileContents: Map<string, string>,
  maxFiles: number = 200
): DependencyMap {
  const modules: ModuleInfo[] = [];
  const edges: DependencyEdge[] = [];
  const allFilePaths = new Set(fileContents.keys());

  const entries = Array.from(fileContents.entries()).slice(0, maxFiles);

  for (const [filePath, content] of entries) {
    const language = detectLanguage(filePath);
    if (!language) continue;

    const rawImports = extractImports(content, language);
    const localImports = rawImports.filter(isLocalImport);

    const resolvedImports: string[] = [];
    for (const imp of localImports) {
      const resolved = resolveImportToModule(imp, allFilePaths);
      if (resolved) {
        resolvedImports.push(resolved);
        edges.push({ from: filePath, to: resolved, type: "import" });
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit lib/parser.ts
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/parser.ts && git commit -m "refactor: rewrite parser to accept file contents map, fix Go regex, remove g flag from patterns"
```

---

### Task 7: Fix lib/health.ts — Remove Fake Scores, Normalize

**Files:**
- Modify: `lib/health.ts`

- [ ] **Step 1: Rewrite lib/health.ts**

```typescript
import { HealthScore, DimensionScore, ScoreDetail } from "./types";
import { GitHubService } from "./github";
import { ANALYSIS_CONFIG } from "./config";
import { createLogger } from "./logger";

const logger = createLogger("health");

export async function calculateHealthScore(
  github: GitHubService,
  readmeContent: string | null
): Promise<HealthScore> {
  const [documentation, issueActivity, maintenance] = await Promise.all([
    calculateDocumentation(github, readmeContent),
    calculateIssueActivity(github),
    calculateMaintenance(github),
  ]);

  const { documentation: wDoc, issueActivity: wIssue, maintenance: wMaint } = ANALYSIS_CONFIG.healthWeights;
  const overall = Math.round(
    documentation.score * wDoc +
    issueActivity.score * wIssue +
    maintenance.score * wMaint
  );

  return { overall, documentation, issueActivity, maintenance };
}

function normalizeScore(rawScore: number, maxPoints: number): number {
  return Math.round((rawScore / maxPoints) * 100);
}

async function calculateDocumentation(
  github: GitHubService,
  readmeContent: string | null
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  // README length
  const readmeLength = readmeContent?.length || 0;
  const readmeMaxPoints = 30;
  maxPoints += readmeMaxPoints;
  const readmePoints = readmeLength > ANALYSIS_CONFIG.healthThresholds.readmeLength
    ? readmeMaxPoints
    : Math.min(readmeMaxPoints, Math.floor(readmeLength / (ANALYSIS_CONFIG.healthThresholds.readmeLength / readmeMaxPoints)));
  details.push({ metric: "README length", value: readmeLength, points: readmePoints, maxPoints: readmeMaxPoints });
  rawScore += readmePoints;

  // Has installation docs
  const hasInstall = readmeContent
    ? /install|setup|getting started|quickstart|usage/i.test(readmeContent)
    : false;
  const installMaxPoints = 25;
  maxPoints += installMaxPoints;
  const installPoints = hasInstall ? installMaxPoints : 0;
  details.push({ metric: "Has installation docs", value: hasInstall, points: installPoints, maxPoints: installMaxPoints });
  rawScore += installPoints;

  // CONTRIBUTING.md + CHANGELOG.md (parallel check)
  const fileExists = await github.checkMultipleFilesExist(["CONTRIBUTING.md", "CHANGELOG.md", "CHANGELOG"]);
  const contributingMaxPoints = 20;
  const changelogMaxPoints = 10;
  maxPoints += contributingMaxPoints + changelogMaxPoints;

  const contributingPoints = fileExists["CONTRIBUTING.md"] ? contributingMaxPoints : 0;
  details.push({ metric: "CONTRIBUTING.md exists", value: fileExists["CONTRIBUTING.md"], points: contributingPoints, maxPoints: contributingMaxPoints });
  rawScore += contributingPoints;

  const changelogPoints = (fileExists["CHANGELOG.md"] || fileExists["CHANGELOG"]) ? changelogMaxPoints : 0;
  details.push({ metric: "CHANGELOG exists", value: fileExists["CHANGELOG.md"] || fileExists["CHANGELOG"], points: changelogPoints, maxPoints: changelogMaxPoints });
  rawScore += changelogMaxPoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
    details,
  };
}

async function calculateIssueActivity(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  const stats = await github.getIssuesStats();

  // Open issues count
  const openIssuesMaxPoints = 30;
  maxPoints += openIssuesMaxPoints;
  const lowIssuesPoints = stats.openCount < ANALYSIS_CONFIG.healthThresholds.openIssuesLow
    ? openIssuesMaxPoints
    : Math.max(0, openIssuesMaxPoints - Math.floor((stats.openCount - ANALYSIS_CONFIG.healthThresholds.openIssuesLow) / 10) * 5);
  details.push({ metric: "Open issues count", value: stats.openCount, points: lowIssuesPoints, maxPoints: openIssuesMaxPoints });
  rawScore += lowIssuesPoints;

  // Average close time
  const closeTimeMaxPoints = 30;
  maxPoints += closeTimeMaxPoints;
  const avgCloseDays = stats.avgCloseDays;
  const closeTimePoints = avgCloseDays !== null
    ? (avgCloseDays < ANALYSIS_CONFIG.healthThresholds.avgCloseDaysGood
      ? closeTimeMaxPoints
      : Math.max(0, closeTimeMaxPoints - Math.floor((avgCloseDays - ANALYSIS_CONFIG.healthThresholds.avgCloseDaysGood) / 3) * 5))
    : 0;
  details.push({ metric: "Avg issue close time (days)", value: avgCloseDays ?? "N/A", points: closeTimePoints, maxPoints: closeTimeMaxPoints });
  rawScore += closeTimePoints;

  // Issues use labels
  const labelMaxPoints = 20;
  maxPoints += labelMaxPoints;
  const labelPoints = stats.hasLabels ? labelMaxPoints : 0;
  details.push({ metric: "Issues use labels", value: stats.hasLabels, points: labelPoints, maxPoints: labelMaxPoints });
  rawScore += labelPoints;

  // Recently closed
  const recentMaxPoints = 20;
  maxPoints += recentMaxPoints;
  const recentPoints = stats.recentlyClosed ? recentMaxPoints : 0;
  details.push({ metric: "Issues closed in last 30 days", value: stats.recentlyClosed, points: recentPoints, maxPoints: recentMaxPoints });
  rawScore += recentPoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
    details,
  };
}

async function calculateMaintenance(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  const [commits, contributors, latestRelease] = await Promise.all([
    github.getRecentCommits(30),
    github.getContributorsCount(),
    github.getLatestRelease(),
  ]);

  // Recent commit
  const recentCommitMaxPoints = 25;
  maxPoints += recentCommitMaxPoints;
  const lastCommitDate = commits[0]?.date;
  const daysSinceLastCommit = lastCommitDate
    ? (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const recentCommitPoints = daysSinceLastCommit < ANALYSIS_CONFIG.healthThresholds.recentCommitDays
    ? recentCommitMaxPoints
    : Math.max(0, recentCommitMaxPoints - Math.floor((daysSinceLastCommit - ANALYSIS_CONFIG.healthThresholds.recentCommitDays) / 15) * 5);
  details.push({ metric: "Days since last commit", value: Math.round(daysSinceLastCommit), points: recentCommitPoints, maxPoints: recentCommitMaxPoints });
  rawScore += recentCommitPoints;

  // Monthly commits
  const commitFreqMaxPoints = 25;
  maxPoints += commitFreqMaxPoints;
  const monthlyCommits = commits.filter((c) => {
    const date = new Date(c.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;
  const commitFreqPoints = monthlyCommits > ANALYSIS_CONFIG.healthThresholds.monthlyCommitsGood
    ? commitFreqMaxPoints
    : Math.min(commitFreqMaxPoints, Math.round(monthlyCommits * (commitFreqMaxPoints / ANALYSIS_CONFIG.healthThresholds.monthlyCommitsGood)));
  details.push({ metric: "Commits in last 30 days", value: monthlyCommits, points: commitFreqPoints, maxPoints: commitFreqMaxPoints });
  rawScore += commitFreqPoints;

  // Contributors
  const contributorMaxPoints = 25;
  maxPoints += contributorMaxPoints;
  const contributorPoints = contributors > ANALYSIS_CONFIG.healthThresholds.contributorsGood
    ? contributorMaxPoints
    : Math.min(contributorMaxPoints, Math.round(contributors * (contributorMaxPoints / ANALYSIS_CONFIG.healthThresholds.contributorsGood)));
  details.push({ metric: "Contributors", value: contributors, points: contributorPoints, maxPoints: contributorMaxPoints });
  rawScore += contributorPoints;

  // Recent release
  const releaseMaxPoints = 25;
  maxPoints += releaseMaxPoints;
  const hasRecentRelease = latestRelease
    ? (Date.now() - new Date(latestRelease.date).getTime()) / (1000 * 60 * 60 * 24 * (ANALYSIS_CONFIG.healthThresholds.releaseMonths * 30)) < 1
    : false;
  const releasePoints = hasRecentRelease ? releaseMaxPoints : 0;
  details.push({ metric: "Release in last 6 months", value: hasRecentRelease, points: releasePoints, maxPoints: releaseMaxPoints });
  rawScore += releasePoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
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

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit lib/health.ts
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/health.ts && git commit -m "fix: remove fake health scores, normalize to 0-100, parallelize file existence checks"
```

---

### Task 8: Rewrite lib/analyzer.ts — Pipeline with Parallel Phases

**Files:**
- Modify: `lib/analyzer.ts`
- Modify: `lib/types.ts` (add PipelineProgress type)

- [ ] **Step 1: Add PipelineProgress type to lib/types.ts**

Add at the end of `lib/types.ts`:

```typescript
// Pipeline progress
export type PipelinePhase = "metadata" | "structure" | "analysis" | "report";

export interface PipelineProgress {
  phase: PipelinePhase;
  message: string;
}
```

- [ ] **Step 2: Rewrite lib/analyzer.ts**

```typescript
import { AnalysisReport, TechStack, LanguageInfo, FrameworkInfo, DirectoryPattern, PipelineProgress } from "./types";
import { GitHubService } from "./github";
import { identifyDirectoryPatterns, extractConfigFileNames, countFiles, collectParseableFilePaths } from "./scanner";
import { parseDependencies } from "./parser";
import { generateBaseSummary } from "./summary/templates";
import { refineSummary } from "./summary/llm";
import { generateDiagrams } from "./diagram";
import { calculateHealthScore } from "./health";
import { ANALYSIS_CONFIG } from "./config";
import { getLanguageColor } from "./colors";
import { createLogger } from "./logger";

const logger = createLogger("analyzer");

export type ProgressCallback = (progress: PipelineProgress) => void;

function identifyTechStack(
  configFiles: Record<string, string | null>,
  languageBytes: Record<string, number>
): TechStack {
  const langInfos: LanguageInfo[] = [];
  const frameworks: FrameworkInfo[] = [];
  let packageManager: string | null = null;

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  if (totalBytes > 0) {
    for (const [lang, bytes] of Object.entries(languageBytes)) {
      langInfos.push({
        name: lang,
        percentage: (bytes / totalBytes) * 100,
        color: getLanguageColor(lang),
      });
    }
  }

  if (configFiles["package.json"]) {
    try {
      const pkg = JSON.parse(configFiles["package.json"]!);
      packageManager = "npm";
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        const v = (version as string).replace(/^[\^~>=<]*/, "");
        frameworks.push({ name, version: v || null, category: categorizeNpmPackage(name) });
      }
    } catch {
      logger.warn("Failed to parse package.json");
    }
  }

  if (configFiles["pyproject.toml"]) packageManager = "pip";
  if (configFiles["go.mod"]) packageManager = "go modules";
  if (configFiles["Cargo.toml"]) packageManager = "cargo";

  langInfos.sort((a, b) => b.percentage - a.percentage);
  return { languages: langInfos, frameworks, packageManager };
}

function categorizeNpmPackage(name: string): "framework" | "library" | "tool" {
  const frameworks = new Set(["react", "vue", "angular", "next", "nuxt", "svelte", "express", "fastify", "nestjs", "koa", "hapi", "remix", "astro", "solid-js"]);
  const tools = new Set(["typescript", "eslint", "prettier", "jest", "vitest", "webpack", "vite", "rollup", "esbuild", "babel", "postcss", "tailwindcss"]);
  if (frameworks.has(name)) return "framework";
  if (tools.has(name)) return "tool";
  return "library";
}

export async function analyzeRepository(
  url: string,
  token?: string,
  onProgress?: ProgressCallback
): Promise<AnalysisReport> {
  const github = GitHubService.fromUrl(url, token);

  // Phase 1: Metadata (parallel)
  onProgress?.({ phase: "metadata", message: ANALYSIS_CONFIG.progressLabels.metadata });
  const [meta, readmeContent, languageBytes] = await Promise.all([
    github.getRepoMeta(),
    github.getFileContent("README.md"),
    github.listLanguages(),
  ]);

  // Phase 2: Structure (parallel)
  onProgress?.({ phase: "structure", message: ANALYSIS_CONFIG.progressLabels.structure });
  const fileTree = await github.getFileTree();
  const configFilePaths = extractConfigFileNames(fileTree);
  const configFileContents = await github.getMultipleFiles(configFilePaths);
  const patterns = identifyDirectoryPatterns(fileTree);
  const fileStats = countFiles(fileTree);

  // Phase 3: Analysis (parallel)
  onProgress?.({ phase: "analysis", message: ANALYSIS_CONFIG.progressLabels.analysis });
  const parseablePaths = collectParseableFilePaths(fileTree).slice(0, ANALYSIS_CONFIG.maxFilesToParse);
  const parseableContents = await github.getMultipleFiles(parseablePaths);
  const fileContentsMap = new Map<string, string>();
  for (const [path, content] of Object.entries(parseableContents)) {
    if (content) fileContentsMap.set(path, content);
  }

  const [techStack, depMap] = await Promise.all([
    Promise.resolve(identifyTechStack(configFileContents, languageBytes)),
    Promise.resolve(parseDependencies(fileContentsMap, ANALYSIS_CONFIG.maxFilesToParse)),
  ]);

  // Phase 4: Report (parallel)
  onProgress?.({ phase: "report", message: ANALYSIS_CONFIG.progressLabels.report });
  const baseSummary = generateBaseSummary(meta, fileTree, techStack, patterns, depMap, configFileContents as Record<string, string>);

  const [summary, diagrams, health] = await Promise.all([
    refineSummary(baseSummary, { owner: meta.owner, name: meta.name, description: meta.description }),
    Promise.resolve(generateDiagrams(depMap, fileTree, patterns)),
    calculateHealthScore(github, readmeContent),
  ]);

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

- [ ] **Step 3: Create lib/colors.ts**

```typescript
const LANGUAGE_COLORS: Record<string, string> = {
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

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || "#8b8b8b";
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add lib/analyzer.ts lib/types.ts lib/colors.ts && git commit -m "refactor: rewrite analyzer as parallel pipeline with progress callbacks"
```

---

### Task 9: Rewrite API Routes — SSE Streaming + Secure Token

**Files:**
- Modify: `app/api/analyze/route.ts`
- Delete: `app/api/github/route.ts`

- [ ] **Step 1: Rewrite app/api/analyze/route.ts**

```typescript
import { NextRequest } from "next/server";
import { analyzeRepository } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/types";
import { ANALYSIS_CONFIG } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:analyze");

// LRU Cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ANALYSIS_CONFIG.cacheTTL) {
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  // Evict oldest entries if cache is full
  if (cache.size >= ANALYSIS_CONFIG.maxCacheEntries) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { url, token } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "Repository URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const githubUrlPattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(url.replace(/\.git$/, ""))) {
      return new Response(JSON.stringify({ error: "Invalid GitHub repository URL format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cacheKey = `${url}:${token ? "auth" : "anon"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const report = await analyzeRepository(url, token, (progress) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`));
          });

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", data: report })}\n\n`));

          // Cache result
          setCache(cacheKey, report);

          controller.close();
        } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          logger.error("Analysis failed", { error: String(error) });

          const status = err.status === 404 ? 404 : err.status === 403 ? 429 : 500;
          const message = err.status === 404
            ? "Repository not found. It may be private - try adding a GitHub token."
            : err.status === 403
            ? "GitHub API rate limit exceeded. Try adding a GitHub token or wait a bit."
            : err.message || "Analysis failed";

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message, status })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    logger.error("Request parsing failed", { error: String(error) });
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

- [ ] **Step 2: Delete app/api/github/route.ts**

```bash
rm /Users/xiatian/Desktop/RepoLens/app/api/github/route.ts
```

Also remove the empty directory if it exists:
```bash
rmdir /Users/xiatian/Desktop/RepoLens/app/api/github 2>/dev/null; true
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add -A && git commit -m "refactor: rewrite analyze API as SSE streaming, remove github proxy route, add LRU cache"
```

---

### Task 10: Add Error Boundaries and 404 Page

**Files:**
- Create: `app/error.tsx`
- Create: `app/global-error.tsx`
- Create: `app/not-found.tsx`
- Create: `app/report/[id]/error.tsx`

- [ ] **Step 1: Create app/error.tsx**

```tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message || "An unexpected error occurred"}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create app/global-error.tsx**

```tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Application Error</h2>
          <p style={{ color: "#666", marginTop: "0.5rem" }}>{error.message || "An unexpected error occurred"}</p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#0070f3", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create app/not-found.tsx**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/" className="text-primary underline">
          Go back home
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create app/report/[id]/error.tsx**

```tsx
"use client";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold">Report Error</h2>
        <p className="text-muted-foreground">{error.message || "Failed to load analysis report"}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            New Analysis
          </a>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add app/error.tsx app/global-error.tsx app/not-found.tsx app/report/\[id\]/error.tsx && git commit -m "feat: add error boundaries, global error handler, and 404 page"
```

---

### Task 11: Update Frontend for SSE Streaming

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/report/[id]/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx with SSE support**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/shared/url-input";
import { TokenInput } from "@/components/shared/token-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AnalysisReport } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setProgressMessage("Starting analysis...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: token || undefined }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let report: AnalysisReport | null = null;

        if (!reader) {
          setError("Failed to read response stream");
          setIsLoading(false);
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress") {
              setProgressMessage(data.message);
            } else if (data.type === "complete") {
              report = data.data;
            } else if (data.type === "error") {
              setError(data.error);
              setIsLoading(false);
              return;
            }
          }
        }

        if (report) {
          sessionStorage.setItem(`report-${report.id}`, JSON.stringify(report));
          router.push(`/report/${encodeURIComponent(report.id)}`);
        }
      } else {
        // JSON response (fallback for cached results)
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Analysis failed");
          setIsLoading(false);
          return;
        }
        sessionStorage.setItem(`report-${data.id}`, JSON.stringify(data));
        router.push(`/report/${encodeURIComponent(data.id)}`);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong");
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

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner text={progressMessage || "Analyzing..."} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
          <TokenInput value={token} onChange={setToken} />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-4 py-2 rounded-md max-w-2xl">
          {error}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Update app/report/[id]/page.tsx**

Replace the existing content with the same structure but ensure it uses `Link` from `next/link` instead of `<a>` for internal navigation, and handles the case where sessionStorage might fail.

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add app/page.tsx app/report/\[id\]/page.tsx && git commit -m "feat: add SSE streaming progress to analyze flow, improve error handling"
```

---

### Task 12: Update next.config.ts — Security Headers

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add next.config.ts && git commit -m "feat: add security headers and disable X-Powered-By"
```

---

### Task 13: Integration Test — Build and Verify

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/xiatian/Desktop/RepoLens && npx tsc --noEmit
```

Fix any type errors found.

- [ ] **Step 2: Run lint**

```bash
cd /Users/xiatian/Desktop/RepoLens && npm run lint
```

Fix any lint errors found.

- [ ] **Step 3: Run build**

```bash
cd /Users/xiatian/Desktop/RepoLens && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes**

```bash
cd /Users/xiatian/Desktop/RepoLens && git add -A && git commit -m "fix: resolve Phase 1 integration issues"
```

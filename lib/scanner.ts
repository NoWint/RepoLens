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
  configFiles: Record<string, string>;
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

import { DependencyMap, ModuleInfo, DependencyEdge } from "./types";
import fs from "fs";
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
    /"([^"]+)"/g,
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
  if (allFiles.has(importPath)) return importPath;

  const extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];
  for (const ext of extensions) {
    if (allFiles.has(importPath + ext)) return importPath + ext;
  }

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

export function parseEntryFiles(rootPath: string): DependencyMap {
  const modules: ModuleInfo[] = [];
  const edges: DependencyEdge[] = [];
  const allFiles = new Set<string>();

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

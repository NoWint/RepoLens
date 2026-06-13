import { DependencyMap, ModuleInfo, DependencyEdge } from "./types";
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

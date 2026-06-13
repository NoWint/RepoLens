import { AnalysisReport, TechStack, LanguageInfo, FrameworkInfo, DirectoryPattern } from "./types";
import { createGitHubService, GitHubService } from "./github";
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
  languages: string[],
  languageBytes: Record<string, number>
): TechStack {
  const langInfos: LanguageInfo[] = [];
  const frameworks: FrameworkInfo[] = [];
  let packageManager: string | null = null;

  // Calculate language percentages from byte counts
  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  if (totalBytes > 0) {
    for (const [lang, bytes] of Object.entries(languageBytes)) {
      langInfos.push({
        name: lang,
        percentage: (bytes / totalBytes) * 100,
        color: getLanguageColor(lang),
      });
    }
  } else {
    // Fallback: equal distribution
    const count = languages.length || 1;
    languages.forEach((lang) => {
      langInfos.push({
        name: lang,
        percentage: 100 / count,
        color: getLanguageColor(lang),
      });
    });
  }

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

  if (configFiles["pyproject.toml"]) {
    packageManager = "pip";
  }

  if (configFiles["go.mod"]) {
    packageManager = "go modules";
  }

  if (configFiles["Cargo.toml"]) {
    packageManager = "cargo";
  }

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
  let languageBytes: Record<string, number> = {};
  try {
    const { data } = await github["octokit"].rest.repos.listLanguages({
      owner: meta.owner,
      repo: meta.name,
    });
    languageBytes = data as Record<string, number>;
  } catch {
    // Fallback
  }

  const languages = Object.keys(languageBytes);
  if (languages.length === 0 && meta.language) {
    languages.push(meta.language);
    languageBytes[meta.language] = 1;
  }

  // Step 4: Decide analysis depth based on repo size
  let scanResult: ScanResult | null = null;
  let depMap;
  let configFiles: Record<string, string> = {};
  let patterns: DirectoryPattern[] = [];

  if (meta.size <= MAX_REPO_SIZE_KB) {
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
      depMap = { modules: [], edges: [] };
    }
  } else {
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
  const techStack = identifyTechStack(configFiles, languages, languageBytes);

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

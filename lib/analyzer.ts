import { AnalysisReport, TechStack, LanguageInfo, FrameworkInfo } from "./types";
import { getLanguageColor } from "./colors";
import { createLogger } from "./logger";
import { executePipeline, ProgressCallback } from "./pipeline";

const logger = createLogger("analyzer");

export type { ProgressCallback };

export function identifyTechStack(
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

export function categorizeNpmPackage(name: string): "framework" | "library" | "tool" {
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
  const result = await executePipeline(url, token, onProgress);

  const reportId = `${result.meta.owner}/${result.meta.name}:${result.meta.defaultBranch}`;

  return {
    id: reportId,
    meta: result.meta,
    structure: result.fileTree,
    techStack: result.techStack,
    summary: result.summary,
    diagrams: result.diagrams,
    health: result.health,
    analyzedAt: new Date().toISOString(),
  };
}

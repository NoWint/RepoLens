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
  _configFiles: Record<string, string>
): string {
  let analysis = "";

  if (techStack.languages.length > 0) {
    analysis += `**Language Distribution:**\n`;
    for (const lang of techStack.languages) {
      analysis += `- ${lang.name}: ${lang.percentage.toFixed(1)}%\n`;
    }
    analysis += "\n";
  }

  if (techStack.frameworks.length > 0) {
    analysis += `**Key Dependencies:**\n`;
    for (const fw of techStack.frameworks.slice(0, 10)) {
      const version = fw.version ? `@${fw.version}` : "";
      analysis += `- ${fw.name}${version} (${fw.category})\n`;
    }
    analysis += "\n";
  }

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

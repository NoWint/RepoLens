import { DependencyMap, FileTreeNode, Diagrams, DirectoryPattern } from "./types";

export function generateDependencyGraph(depMap: DependencyMap): string {
  if (depMap.modules.length === 0) {
    return "graph LR\n  empty[No module dependencies detected]";
  }

  const lines: string[] = ["graph LR"];

  const topModules = depMap.modules.slice(0, 30);
  const topModulePaths = new Set(topModules.map((m) => m.path));

  for (const mod of topModules) {
    const safeId = sanitizeMermaidId(mod.path);
    const label = mod.name;
    lines.push(`  ${safeId}["${label}"]`);
  }

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
    if (depth > 4) return;

    const nodeId = sanitizeMermaidId(node.path || "root");
    const purpose = patternMap.get(node.path);
    const label = purpose ? `${node.name}<br/><small>${purpose}</small>` : node.name;

    lines.push(`  ${nodeId}["${label}"]`);

    if (parentId) {
      lines.push(`  ${parentId} --> ${nodeId}`);
    }

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

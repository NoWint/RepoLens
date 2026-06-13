import { FileTreeNode, DirectoryPattern } from "./types";
import { SKIP_DIRS, ALLOWED_DOTFILES, CONFIG_FILES, DIRECTORY_PURPOSES } from "./constants";

export interface ScanResult {
  fileTree: FileTreeNode;
  directoryPatterns: DirectoryPattern[];
  configFiles: Record<string, string>;
  totalFiles: number;
  totalSize: number;
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

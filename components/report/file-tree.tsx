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

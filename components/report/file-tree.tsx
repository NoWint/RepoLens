"use client";

import { useState, memo } from "react";
import { FileTreeNode } from "@/lib/types";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  tree: FileTreeNode;
}

export const FileTree = memo(function FileTree({ tree }: FileTreeProps) {
  return (
    <div className="space-y-1 animate-fade-in">
      <h2 className="text-xl font-bold mb-4">File Structure</h2>
      <div className="font-mono text-sm border rounded-xl bg-card overflow-hidden">
        <div className="p-3">
          <TreeNode node={tree} depth={0} />
        </div>
      </div>
    </div>
  );
});

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "dir";

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-muted/50 w-full text-left transition-colors",
            depth === 0 && "font-semibold"
          )}
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
        >
          {expanded ? <ChevronDown size={13} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={13} className="shrink-0 text-muted-foreground" />}
          {expanded ? <FolderOpen size={14} className="text-blue-500 shrink-0" /> : <Folder size={14} className="text-blue-500 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 px-1.5"
      style={{ paddingLeft: `${depth * 16 + 22}px` }}
    >
      <File size={13} className="text-muted-foreground shrink-0" />
      <span className="text-muted-foreground truncate">{node.name}</span>
      {node.size != null && node.size > 0 && (
        <span className="text-[11px] text-muted-foreground/60 ml-auto shrink-0">
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

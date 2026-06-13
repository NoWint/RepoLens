"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Diagrams } from "@/lib/types";
import { useTheme } from "next-themes";

interface ArchitectureProps {
  diagrams: Diagrams;
}

export function Architecture({ diagrams }: ArchitectureProps) {
  const [activeTab, setActiveTab] = useState<"dependency" | "directory">("dependency");
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const mermaidTheme = useMemo(() => resolvedTheme === "dark" ? "dark" : "default", [resolvedTheme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderDiagram = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "strict",
      });

      const code = activeTab === "dependency"
        ? diagrams.dependencyGraph
        : diagrams.directoryStructure;

      const container = containerRef.current!;
      container.innerHTML = "";

      try {
        const { svg } = await mermaid.render(
          `mermaid-${activeTab}-${Date.now()}`,
          code
        );
        container.innerHTML = svg;
      } catch {
        container.innerHTML = `<p class="text-muted-foreground text-sm p-4">Failed to render diagram</p><pre class="text-xs mt-2 p-3 bg-muted rounded-lg overflow-auto">${code}</pre>`;
      }
    };

    renderDiagram();
  }, [activeTab, diagrams, mermaidTheme]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Architecture Diagrams</h2>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("dependency")}
          className={`px-3.5 py-1.5 text-sm rounded-md transition-all ${
            activeTab === "dependency"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Dependency Graph
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-3.5 py-1.5 text-sm rounded-md transition-all ${
            activeTab === "directory"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Directory Structure
        </button>
      </div>

      <div
        ref={containerRef}
        className="mermaid-container border rounded-xl p-4 overflow-auto bg-card min-h-[300px]"
      />
    </div>
  );
}

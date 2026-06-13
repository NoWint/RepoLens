"use client";

import { useEffect, useRef, useState } from "react";
import { Diagrams } from "@/lib/types";

interface ArchitectureProps {
  diagrams: Diagrams;
}

export function Architecture({ diagrams }: ArchitectureProps) {
  const [activeTab, setActiveTab] = useState<"dependency" | "directory">("dependency");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderDiagram = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
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
        container.innerHTML = `<p class="text-muted-foreground text-sm">Failed to render diagram</p><pre class="text-xs mt-2 p-2 bg-muted rounded">${code}</pre>`;
      }
    };

    renderDiagram();
  }, [activeTab, diagrams]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Architecture Diagrams</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("dependency")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "dependency"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Dependency Graph
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "directory"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Directory Structure
        </button>
      </div>

      <div
        ref={containerRef}
        className="border rounded-lg p-4 overflow-auto bg-white min-h-[300px]"
      />
    </div>
  );
}

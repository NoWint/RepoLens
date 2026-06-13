"use client";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "structure", label: "File Structure" },
  { id: "techstack", label: "Tech Stack" },
  { id: "summary", label: "AI Summary" },
  { id: "architecture", label: "Architecture" },
  { id: "health", label: "Health Score" },
] as const;

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="w-48 shrink-0 border-r bg-muted/30">
      <div className="sticky top-0 p-4 space-y-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              activeSection === section.id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

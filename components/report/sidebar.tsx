"use client";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "structure", label: "Files", icon: "📁" },
  { id: "techstack", label: "Tech", icon: "🔧" },
  { id: "summary", label: "Summary", icon: "📝" },
  { id: "architecture", label: "Arch", icon: "🏗️" },
  { id: "health", label: "Health", icon: "💚" },
] as const;

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block w-48 shrink-0 border-r bg-muted/30" role="navigation" aria-label="Report sections">
        <div className="sticky top-0 p-4 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              aria-current={activeSection === section.id ? "page" : undefined}
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

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50" role="navigation" aria-label="Report sections">
        <div className="flex justify-around py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              aria-current={activeSection === section.id ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs rounded-md transition-colors",
                activeSection === section.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <span className="text-base">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderTree,
  Wrench,
  FileText,
  GitBranch,
  Heart,
} from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "structure", label: "Files", Icon: FolderTree },
  { id: "techstack", label: "Tech", Icon: Wrench },
  { id: "summary", label: "Summary", Icon: FileText },
  { id: "architecture", label: "Arch", Icon: GitBranch },
  { id: "health", label: "Health", Icon: Heart },
] as const;

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:block w-52 shrink-0 border-r bg-card/50"
        role="navigation"
        aria-label="Report sections"
      >
        <div className="sticky top-0 p-3 space-y-1">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              aria-current={activeSection === id ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                activeSection === id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm z-50"
        role="navigation"
        aria-label="Report sections"
      >
        <div className="flex justify-around py-1.5 px-1">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              aria-current={activeSection === id ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] rounded-md transition-colors min-w-0",
                activeSection === id
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon size={16} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

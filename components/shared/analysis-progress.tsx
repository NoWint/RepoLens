"use client";

import { PipelinePhase } from "@/lib/types";
import { Database, FolderTree, Wrench, FileText, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const PHASES: { id: PipelinePhase; label: string; icon: typeof Database }[] = [
  { id: "metadata", label: "Fetching metadata", icon: Database },
  { id: "structure", label: "Scanning structure", icon: FolderTree },
  { id: "analysis", label: "Analyzing code", icon: Wrench },
  { id: "report", label: "Generating report", icon: FileText },
];

interface AnalysisProgressProps {
  currentPhase: PipelinePhase | null;
  message: string;
  onCancel: () => void;
}

export function AnalysisProgress({ currentPhase, message, onCancel }: AnalysisProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const progressPercent = currentPhase
    ? Math.min(100, Math.round(((currentIndex + 0.5) / PHASES.length) * 100))
    : 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{message}</span>
          <span className="tabular-nums">{elapsed}s</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Phase steps */}
      <div className="space-y-1">
        {PHASES.map((phase, i) => {
          const isCompleted = currentIndex > i;
          const isCurrent = currentIndex === i;
          const isPending = currentIndex < i;
          const Icon = phase.icon;

          return (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                isCurrent && "bg-primary/5",
                isPending && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 text-primary",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : isCurrent ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <span
                className={cn(
                  "text-sm transition-colors",
                  isCompleted && "text-foreground line-through decoration-muted-foreground",
                  isCurrent && "text-foreground font-medium",
                  isPending && "text-muted-foreground"
                )}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto block"
      >
        Cancel analysis
      </button>
    </div>
  );
}

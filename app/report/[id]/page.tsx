"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/report/sidebar";
import { Overview } from "@/components/report/overview";
import { FileTree } from "@/components/report/file-tree";
import { TechStackView } from "@/components/report/tech-stack";
import { AISummaryView } from "@/components/report/ai-summary";
import { Architecture } from "@/components/report/architecture";
import { HealthScoreView } from "@/components/report/health-score";
import { AnalysisProgress } from "@/components/shared/analysis-progress";
import { Skeleton } from "@/components/shared/loading-spinner";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useReport } from "@/hooks/use-report";
import { GitBranch, RotateCcw } from "lucide-react";

export default function ReportPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const { report, error, isLoading, progress, phase, reset } = useReport(id);
  const [activeSection, setActiveSection] = useState("overview");

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500">
            <GitBranch size={20} />
          </div>
          <p className="text-red-500 font-medium">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
            <RotateCcw size={14} />
            Try again
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading || !report) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <AnalysisProgress
            currentPhase={phase}
            message={progress || "Loading report..."}
            onCancel={reset}
          />
        </div>
      </main>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <Overview meta={report.meta} health={report.health} techStack={report.techStack} />;
      case "structure":
        return <FileTree tree={report.structure} />;
      case "techstack":
        return <TechStackView techStack={report.techStack} />;
      case "summary":
        return <AISummaryView summary={report.summary} />;
      case "architecture":
        return <Architecture diagrams={report.diagrams} />;
      case "health":
        return <HealthScoreView health={report.health} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-lg flex items-center gap-1.5 hover:text-primary transition-colors">
            <GitBranch size={18} />
            RepoLens
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm text-muted-foreground">{report.meta.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => {
              sessionStorage.removeItem(`report-${id}`);
              window.location.href = "/";
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted"
          >
            <RotateCcw size={13} />
            New
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-6 pb-20 md:pb-6 overflow-y-auto max-h-[calc(100vh-53px)]">
          <div key={activeSection}>
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}

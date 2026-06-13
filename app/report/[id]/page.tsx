"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/report/sidebar";
import { Overview } from "@/components/report/overview";
import { FileTree } from "@/components/report/file-tree";
import { TechStackView } from "@/components/report/tech-stack";
import { AISummaryView } from "@/components/report/ai-summary";
import { Architecture } from "@/components/report/architecture";
import { HealthScoreView } from "@/components/report/health-score";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AnalysisReport } from "@/lib/types";

export default function ReportPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get from sessionStorage first
    const cached = sessionStorage.getItem(`report-${id}`);
    if (cached) {
      try {
        setReport(JSON.parse(cached));
        return;
      } catch {
        // Invalid cache
      }
    }

    // If not in cache, re-fetch
    const [owner, repoAndBranch] = id.split("/");
    const [repo] = repoAndBranch.split(":");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://github.com/${owner}/${repo}` }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReport(data);
          sessionStorage.setItem(`report-${id}`, JSON.stringify(data));
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <a href="/" className="text-primary underline">
            Try again
          </a>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="font-bold text-lg">RepoLens</a>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm">{report.meta.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sessionStorage.removeItem(`report-${id}`);
              window.location.href = "/";
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            New Analysis
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-53px)]">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/report/sidebar";
import { Overview } from "@/components/report/overview";
import { FileTree } from "@/components/report/file-tree";
import { TechStackView } from "@/components/report/tech-stack";
import { AISummaryView } from "@/components/report/ai-summary";
import { Architecture } from "@/components/report/architecture";
import { HealthScoreView } from "@/components/report/health-score";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AnalysisReport } from "@/lib/types";

function getCachedReport(id: string): AnalysisReport | null {
  if (typeof window === "undefined") return null;
  const cached = sessionStorage.getItem(`report-${id}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Invalid cache
    }
  }
  return null;
}

export default function ReportPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [report, setReport] = useState<AnalysisReport | null>(() => getCachedReport(id));
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already loaded from cache, skip fetch
    if (report) return;

    // If not in cache, re-fetch
    const [owner, repoAndBranch] = id.split("/");
    const [repo] = repoAndBranch.split(":");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://github.com/${owner}/${repo}` }),
    })
      .then(async (res) => {
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream")) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let reportData: AnalysisReport | null = null;

          if (!reader) throw new Error("Failed to read response stream");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = JSON.parse(line.slice(6));

              if (data.type === "complete") {
                reportData = data.data;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            }
          }

          return reportData;
        } else {
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return data as AnalysisReport;
        }
      })
      .then((data) => {
        if (data) {
          setReport(data);
          sessionStorage.setItem(`report-${id}`, JSON.stringify(data));
        }
      })
      .catch((err) => setError(err.message));
  }, [id, report]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <Link href="/" className="text-primary underline">
            Try again
          </Link>
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
          <Link href="/" className="font-bold text-lg">RepoLens</Link>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/shared/url-input";
import { TokenInput } from "@/components/shared/token-input";
import { AnalysisProgress } from "@/components/shared/analysis-progress";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAnalysis } from "@/hooks/use-analysis";
import { GitBranch, BarChart3, Brain, Shield } from "lucide-react";

const FEATURES = [
  { icon: GitBranch, title: "Architecture Analysis", desc: "Visualize module dependencies and directory structure" },
  { icon: BarChart3, title: "Tech Stack Detection", desc: "Identify languages, frameworks, and package managers" },
  { icon: Brain, title: "AI-Powered Summary", desc: "Get intelligent project introductions and analysis" },
  { icon: Shield, title: "Health Scoring", desc: "Evaluate documentation, activity, and maintenance" },
];

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const { analyze, isLoading, progress, error, reset } = useAnalysis();

  const handleAnalyze = async (url: string) => {
    const report = await analyze(url, token || undefined);
    if (report) {
      sessionStorage.setItem(`report-${report.id}`, JSON.stringify(report));
      router.push(`/report/${encodeURIComponent(report.id)}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="relative text-center space-y-3 animate-slide-up">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <GitBranch size={20} />
            <span className="text-sm font-medium tracking-wide uppercase">Open Source</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Repo<span className="text-primary">Lens</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            Deep analysis for any GitHub repository. Get insights in seconds.
          </p>
        </div>

        <div className="relative w-full flex flex-col items-center gap-3 animate-slide-up stagger-2" style={{ opacity: 0 }}>
          {isLoading && progress ? (
            <AnalysisProgress
              currentPhase={progress.phase}
              message={progress.message}
              onCancel={reset}
            />
          ) : (
            <>
              <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
              <TokenInput value={token} onChange={setToken} />
            </>
          )}
        </div>

        {error && (
          <div className="relative text-sm text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-lg max-w-xl animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="border-t bg-card/30">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/shared/url-input";
import { TokenInput } from "@/components/shared/token-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AnalysisReport } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setProgressMessage("Starting analysis...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: token || undefined }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let report: AnalysisReport | null = null;

        if (!reader) {
          setError("Failed to read response stream");
          setIsLoading(false);
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress") {
              setProgressMessage(data.message);
            } else if (data.type === "complete") {
              report = data.data;
            } else if (data.type === "error") {
              setError(data.error);
              setIsLoading(false);
              return;
            }
          }
        }

        if (report) {
          sessionStorage.setItem(`report-${report.id}`, JSON.stringify(report));
          router.push(`/report/${encodeURIComponent(report.id)}`);
        }
      } else {
        // JSON response (fallback for cached results)
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Analysis failed");
          setIsLoading(false);
          return;
        }
        sessionStorage.setItem(`report-${data.id}`, JSON.stringify(data));
        router.push(`/report/${encodeURIComponent(data.id)}`);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight">RepoLens</h1>
        <p className="text-muted-foreground text-lg">
          Deep analysis for any GitHub repository
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner text={progressMessage || "Analyzing..."} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
          <TokenInput value={token} onChange={setToken} />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-4 py-2 rounded-md max-w-2xl">
          {error}
        </div>
      )}
    </main>
  );
}

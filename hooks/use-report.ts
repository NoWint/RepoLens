"use client";

import { useState, useEffect } from "react";
import { AnalysisReport, PipelinePhase } from "@/lib/types";

interface UseReportReturn {
  report: AnalysisReport | null;
  error: string | null;
  isLoading: boolean;
  progress: string | null;
  phase: PipelinePhase | null;
  reset: () => void;
}

export function useReport(id: string): UseReportReturn {
  const [report, setReport] = useState<AnalysisReport | null>(() => getCachedReport(id));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!getCachedReport(id));
  const [progress, setProgress] = useState<string | null>(null);
  const [phase, setPhase] = useState<PipelinePhase | null>(null);

  const reset = () => {
    setReport(null);
    setError(null);
    setIsLoading(false);
    setProgress(null);
    setPhase(null);
  };

  useEffect(() => {
    if (report) {
      setIsLoading(false);
      return;
    }

    const [owner, repoAndBranch] = id.split("/");
    const [repo] = repoAndBranch.split(":");

    let cancelled = false;
    setPhase("metadata");
    setProgress("Loading report...");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://github.com/${owner}/${repo}` }),
    })
      .then(async (res) => {
        if (cancelled) return null;
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream")) {
          return parseSSEResponse(res, (p) => {
            setPhase(p.phase);
            setProgress(p.message);
          });
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data as AnalysisReport;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setReport(data);
        sessionStorage.setItem(`report-${id}`, JSON.stringify(data));
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, report]);

  return { report, error, isLoading, progress, phase, reset };
}

function getCachedReport(id: string): AnalysisReport | null {
  if (typeof window === "undefined") return null;
  const cached = sessionStorage.getItem(`report-${id}`);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* invalid cache */ }
  }
  return null;
}

interface SSEProgress {
  phase: PipelinePhase;
  message: string;
}

async function parseSSEResponse(
  res: Response,
  onProgress: (p: SSEProgress) => void
): Promise<AnalysisReport | null> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Failed to read response stream");

  const decoder = new TextDecoder();
  let report: AnalysisReport | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "progress") {
          onProgress({ phase: data.phase as PipelinePhase, message: data.message });
        } else if (data.type === "complete") {
          report = data.data;
        } else if (data.type === "error") {
          throw new Error(data.error);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "Unexpected token") throw err;
      }
    }
  }

  return report;
}

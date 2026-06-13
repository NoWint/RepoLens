"use client";

import { useState, useCallback, useRef } from "react";
import { AnalysisReport, PipelinePhase } from "@/lib/types";

export interface AnalysisProgress {
  phase: PipelinePhase;
  message: string;
}

interface UseAnalysisReturn {
  analyze: (url: string, token?: string) => Promise<AnalysisReport | null>;
  isLoading: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress(null);
    setError(null);
  }, []);

  const analyze = useCallback(async (url: string, token?: string): Promise<AnalysisReport | null> => {
    setIsLoading(true);
    setError(null);
    setProgress({ phase: "metadata", message: "Starting analysis..." });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: token || undefined }),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        return await parseSSEResponse(res, setProgress, setError);
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return null;
      }
      return data as AnalysisReport;
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      setError((err as Error).message || "Something went wrong");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analyze, isLoading, progress, error, reset };
}

async function parseSSEResponse(
  res: Response,
  onProgress: (p: AnalysisProgress) => void,
  onError: (msg: string) => void
): Promise<AnalysisReport | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    onError("Failed to read response stream");
    return null;
  }

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
          onError(data.error);
          return null;
        }
      } catch {
        // Skip malformed SSE data
      }
    }
  }

  return report;
}

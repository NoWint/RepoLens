"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/shared/url-input";
import { TokenInput } from "@/components/shared/token-input";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: token || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setIsLoading(false);
        return;
      }

      // Store result in sessionStorage and navigate
      sessionStorage.setItem(`report-${data.id}`, JSON.stringify(data));
      router.push(`/report/${encodeURIComponent(data.id)}`);
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

      <div className="flex flex-col items-center gap-3 w-full">
        <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
        <TokenInput value={token} onChange={setToken} />
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-4 py-2 rounded-md max-w-2xl">
          {error}
        </div>
      )}
    </main>
  );
}

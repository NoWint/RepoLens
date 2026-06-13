"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md animate-fade-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={20} />
        </div>
        <h2 className="text-xl font-bold">Report Error</h2>
        <p className="text-muted-foreground">{error.message || "Failed to load analysis report"}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <RotateCcw size={14} />
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            New Analysis
          </Link>
        </div>
      </div>
    </main>
  );
}

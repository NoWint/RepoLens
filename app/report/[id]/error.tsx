"use client";

import Link from "next/link";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold">Report Error</h2>
        <p className="text-muted-foreground">{error.message || "Failed to load analysis report"}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            New Analysis
          </Link>
        </div>
      </div>
    </main>
  );
}

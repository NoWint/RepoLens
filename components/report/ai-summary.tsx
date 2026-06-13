import { AISummary } from "@/lib/types";
import { memo } from "react";

interface AISummaryProps {
  summary: AISummary;
}

export const AISummaryView = memo(function AISummaryView({ summary }: AISummaryProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold">AI Summary</h2>

      <div className="space-y-5">
        <section className="p-5 border rounded-xl bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Project Introduction
          </h3>
          <p className="leading-relaxed">
            {summary.introduction}
          </p>
        </section>

        <section className="p-5 border rounded-xl bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Architecture
          </h3>
          <div className="leading-relaxed whitespace-pre-line">
            {summary.architecture}
          </div>
        </section>

        <section className="p-5 border rounded-xl bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Technical Analysis
          </h3>
          <div className="leading-relaxed whitespace-pre-line">
            {summary.technicalAnalysis}
          </div>
        </section>
      </div>
    </div>
  );
});

import { AISummary } from "@/lib/types";

interface AISummaryProps {
  summary: AISummary;
}

export function AISummaryView({ summary }: AISummaryProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">AI Summary</h2>

      <div>
        <h3 className="text-lg font-semibold mb-2">Project Introduction</h3>
        <p className="text-muted-foreground leading-relaxed">
          {summary.introduction}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Architecture</h3>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.architecture}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Technical Analysis</h3>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.technicalAnalysis}
        </div>
      </div>
    </div>
  );
}

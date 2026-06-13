import { HealthScore as HealthScoreType } from "@/lib/types";
import { getScoreColor, getScoreBg, getScoreStroke, getScoreLabel } from "@/lib/colors";
import { memo } from "react";

interface HealthScoreProps {
  health: HealthScoreType;
}

export const HealthScoreView = memo(function HealthScoreView({ health }: HealthScoreProps) {
  const dimensions = [
    { key: "documentation", label: "Documentation Quality", data: health.documentation },
    { key: "issueActivity", label: "Issue Activity", data: health.issueActivity },
    { key: "maintenance", label: "Maintenance", data: health.maintenance },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold">Health Score</h2>

      <div className="flex items-center gap-6 p-6 border rounded-xl bg-card">
        <div className="relative h-28 w-28 shrink-0">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={`${getScoreStroke(health.overall)} animate-score-fill`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums ${getScoreColor(health.overall)}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Overall Health</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {health.overall >= 71
              ? "This project is in good health with active maintenance and good documentation."
              : health.overall >= 41
              ? "This project has moderate health. Some areas could use improvement."
              : "This project may have maintenance or documentation issues."}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {dimensions.map(({ key, label, data }) => (
          <div key={key} className="border rounded-xl p-5 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{label}</h4>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold tabular-nums ${getScoreColor(data.score)}`}>
                  {data.score}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreBg(data.score)}/10 ${getScoreColor(data.score)}`}>
                  {getScoreLabel(data.score)}
                </span>
              </div>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getScoreBg(data.score)}`}
                style={{ width: `${data.score}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm pt-1">
              {data.details.map((detail, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{detail.metric}</span>
                  <span className="font-medium tabular-nums">
                    {typeof detail.value === "boolean"
                      ? detail.value ? "Yes" : "No"
                      : String(detail.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

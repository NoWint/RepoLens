import { HealthScore as HealthScoreType } from "@/lib/types";

interface HealthScoreProps {
  health: HealthScoreType;
}

export function HealthScoreView({ health }: HealthScoreProps) {
  const dimensions = [
    { key: "documentation", label: "Documentation Quality", data: health.documentation },
    { key: "issueActivity", label: "Issue Activity", data: health.issueActivity },
    { key: "maintenance", label: "Maintenance", data: health.maintenance },
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Health Score</h2>

      <div className="flex items-center gap-6 p-4 border rounded-lg">
        <div className="relative h-28 w-28">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={getScoreColor(health.overall)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(health.overall)}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Overall Health</h3>
          <p className="text-sm text-muted-foreground">
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
          <div key={key} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{label}</h4>
              <span className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                {data.score}
              </span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getScoreBg(data.score)}`}
                style={{ width: `${data.score}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.details.map((detail, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{detail.metric}</span>
                  <span>
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
}

function getScoreColor(score: number): string {
  if (score >= 71) return "text-green-500";
  if (score >= 41) return "text-yellow-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 71) return "bg-green-500";
  if (score >= 41) return "bg-yellow-500";
  return "bg-red-500";
}

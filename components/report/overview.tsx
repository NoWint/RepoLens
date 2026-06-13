import { RepoMeta, HealthScore, TechStack } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface OverviewProps {
  meta: RepoMeta;
  health: HealthScore;
  techStack: TechStack;
}

export function Overview({ meta, health, techStack }: OverviewProps) {
  const scoreColor =
    health.overall >= 71
      ? "text-green-500"
      : health.overall >= 41
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{meta.fullName}</h2>
        {meta.description && (
          <p className="text-muted-foreground mt-1">{meta.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">⭐ {meta.stars.toLocaleString()}</span>
        <span className="flex items-center gap-1">🍴 {meta.forks.toLocaleString()}</span>
        <span className="flex items-center gap-1">📋 {meta.openIssues} issues</span>
        {meta.license && (
          <span className="flex items-center gap-1">📄 {meta.license}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={scoreColor}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <p className="font-medium">Health Score</p>
          <p className="text-sm text-muted-foreground">
            {health.overall >= 71 ? "Healthy" : health.overall >= 41 ? "Moderate" : "At Risk"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Tech Stack</h3>
        <div className="flex flex-wrap gap-1.5">
          {techStack.languages.map((lang) => (
            <Badge key={lang.name} variant="secondary">
              {lang.name} {lang.percentage.toFixed(0)}%
            </Badge>
          ))}
          {techStack.frameworks
            .filter((f) => f.category === "framework")
            .slice(0, 5)
            .map((fw) => (
              <Badge key={fw.name} variant="outline">
                {fw.name}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}

import { RepoMeta, HealthScore, TechStack } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { getScoreColor, getScoreLabel, getScoreStroke } from "@/lib/colors";
import { Star, GitFork, AlertCircle, Scale } from "lucide-react";

interface OverviewProps {
  meta: RepoMeta;
  health: HealthScore;
  techStack: TechStack;
}

export function Overview({ meta, health, techStack }: OverviewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{meta.fullName}</h2>
        {meta.description && (
          <p className="text-muted-foreground mt-1.5 leading-relaxed">{meta.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star size={14} className="text-amber-500" />
          {meta.stars.toLocaleString()} stars
        </span>
        <span className="flex items-center gap-1.5">
          <GitFork size={14} />
          {meta.forks.toLocaleString()} forks
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle size={14} />
          {meta.openIssues} issues
        </span>
        {meta.license && (
          <span className="flex items-center gap-1.5">
            <Scale size={14} />
            {meta.license}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 p-5 border rounded-xl bg-card">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${health.overall * 2.51} 251`}
              strokeLinecap="round"
              className={`${getScoreStroke(health.overall)} animate-score-fill`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(health.overall)}`}>
              {health.overall}
            </span>
          </div>
        </div>
        <div>
          <p className="font-semibold">Health Score</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {getScoreLabel(health.overall)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2.5">Tech Stack</h3>
        <div className="flex flex-wrap gap-1.5">
          {techStack.languages.map((lang) => (
            <Badge key={lang.name} variant="secondary" className="gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
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

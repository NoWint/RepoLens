const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
};

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || "#8b8b8b";
}

export type ScoreLevel = "healthy" | "moderate" | "at-risk";

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 71) return "healthy";
  if (score >= 41) return "moderate";
  return "at-risk";
}

export function getScoreColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case "healthy": return "text-emerald-500";
    case "moderate": return "text-amber-500";
    case "at-risk": return "text-red-500";
  }
}

export function getScoreBg(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case "healthy": return "bg-emerald-500";
    case "moderate": return "bg-amber-500";
    case "at-risk": return "bg-red-500";
  }
}

export function getScoreStroke(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case "healthy": return "stroke-emerald-500";
    case "moderate": return "stroke-amber-500";
    case "at-risk": return "stroke-red-500";
  }
}

export function getScoreLabel(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case "healthy": return "Healthy";
    case "moderate": return "Moderate";
    case "at-risk": return "At Risk";
  }
}

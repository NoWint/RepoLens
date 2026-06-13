import { TechStack as TechStackType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface TechStackProps {
  techStack: TechStackType;
}

export function TechStackView({ techStack }: TechStackProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Tech Stack</h2>

      <div>
        <h3 className="text-sm font-medium mb-3">Languages</h3>
        <div className="space-y-2">
          {techStack.languages.map((lang) => (
            <div key={lang.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: lang.color }}
              />
              <span className="text-sm w-24">{lang.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${lang.percentage}%`,
                    backgroundColor: lang.color,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {lang.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {techStack.frameworks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Frameworks & Libraries</h3>
          <div className="flex flex-wrap gap-1.5">
            {techStack.frameworks.map((fw) => (
              <Badge
                key={fw.name}
                variant={fw.category === "framework" ? "default" : "secondary"}
              >
                {fw.name}
                {fw.version && (
                  <span className="text-xs opacity-70 ml-1">v{fw.version}</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {techStack.packageManager && (
        <div>
          <h3 className="text-sm font-medium mb-1">Package Manager</h3>
          <p className="text-sm text-muted-foreground">{techStack.packageManager}</p>
        </div>
      )}
    </div>
  );
}

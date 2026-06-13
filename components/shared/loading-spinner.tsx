export function LoadingSpinner({ text = "Analyzing repository..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-muted" />
        <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">{text}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className || ""}`} />;
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 p-6 border rounded-xl">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function ScoreSkeleton() {
  return (
    <div className="flex items-center gap-6 p-6 border rounded-xl">
      <Skeleton className="h-28 w-28 rounded-full" />
      <div className="space-y-3 flex-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

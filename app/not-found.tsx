import Link from "next/link";
import { GitBranch } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
          <GitBranch size={20} />
        </div>
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
          Go back home
        </Link>
      </div>
    </main>
  );
}

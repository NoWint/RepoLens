import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function AnalyzePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <LoadingSpinner text="Analyzing repository... This may take a moment." />
    </main>
  );
}

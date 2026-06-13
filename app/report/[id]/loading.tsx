import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <LoadingSpinner text="Loading report..." />
    </main>
  );
}

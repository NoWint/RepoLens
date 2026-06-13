import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/" className="text-primary underline">
          Go back home
        </Link>
      </div>
    </main>
  );
}

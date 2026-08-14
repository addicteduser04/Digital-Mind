import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">This space is not ready yet.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Return to your daily operating view.</p>
        <Link className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm text-background" href="/today">
          Go to Today
        </Link>
      </div>
    </main>
  );
}

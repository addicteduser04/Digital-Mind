"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Digital Mind could not load.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your data has not been changed.</p>
        <button className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-sm text-background" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}

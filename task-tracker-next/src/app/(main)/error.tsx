"use client";
// Client: Next.js requires error boundaries to be client components (they get a reset() callback).

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main">
      <section className="panel" aria-labelledby="error-heading">
        <h1 id="error-heading">Something went wrong</h1>
        <p>We could not show this page. Please try again.</p>
        <button type="button" className="button-primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

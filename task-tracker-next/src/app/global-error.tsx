"use client";
// Client: required for error boundaries. Used only when the root layout itself fails, so it
// brings its own <html> and <body>. The error itself is never shown.

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main>
          <title>Something went wrong | Tasks</title>
          <h1>Something went wrong</h1>
          <p>We could not show this page. Please try again.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

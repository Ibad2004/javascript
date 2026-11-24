import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="app">
      <h1>Page not found</h1>
      <p>We could not find that page.</p>
      <p>
        <Link href="/tasks">Back to your tasks</Link>
      </p>
    </main>
  );
}

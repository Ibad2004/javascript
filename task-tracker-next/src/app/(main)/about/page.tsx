import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main id="main">
      <section className="panel" aria-labelledby="about-heading">
        <h1 id="about-heading">About</h1>
        <h2>Server components</h2>
        <p>
          Pages and layouts are server components by default. They run on the server, can read
          data directly (like the task list), and send only HTML to the browser. Their code is
          not shipped to the browser.
        </p>
        <h2>Client components</h2>
        <p>
          A file that starts with &quot;use client&quot; runs in the browser too. We use this only
          where we need state, events or browser APIs: the search box, the filter buttons, the task
          forms, the done checkboxes and the delete dialog.
        </p>
        <h2>Rule of thumb</h2>
        <p>Stay on the server until the component needs interaction.</p>
      </section>
    </main>
  );
}

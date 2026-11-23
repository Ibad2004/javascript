import type { Metadata } from "next";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <main id="main" className="auth-page">
      <section className="panel" aria-labelledby="auth-heading">
        <h1 id="auth-heading">Log in</h1>
        <p className="notice-info">Login works on Day 24</p>
        <form className="task-form" noValidate>
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" autoComplete="username" />
          <PasswordField autoComplete="current-password" />
          <div className="form-buttons">
            <button type="submit" className="button-primary" disabled>
              Log in
            </button>
          </div>
        </form>
        <p>No account yet? <Link href="/signup">Sign up</Link></p>
        <p>
          <Link href="/">Back to tasks</Link>
        </p>
      </section>
    </main>
  );
}

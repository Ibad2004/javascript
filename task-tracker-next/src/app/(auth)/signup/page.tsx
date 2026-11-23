import type { Metadata } from "next";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <main id="main" className="auth-page">
      <section className="panel" aria-labelledby="auth-heading">
        <h1 id="auth-heading">Sign up</h1>
        <p className="notice-info">Login works on Day 24</p>
        <form className="task-form" noValidate>
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" autoComplete="email" />
          <PasswordField autoComplete="new-password" hint="Use 8 to 72 characters." />
          <div className="form-buttons">
            <button type="submit" className="button-primary" disabled>
              Sign up
            </button>
          </div>
        </form>
        <p>Already have an account? <Link href="/login">Log in</Link></p>
        <p>
          <Link href="/">Back to tasks</Link>
        </p>
      </section>
    </main>
  );
}

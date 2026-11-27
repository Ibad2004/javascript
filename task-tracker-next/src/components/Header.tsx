import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";
import type { SessionUser } from "@/lib/userData";

/** An error in a layout skips (main)/error.tsx, so the header hides itself and the page reports it. */
async function readUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function Header() {
  const user = await readUser();
  return (
    <header className="app-header">
      <p className="app-name">
        <Link href="/tasks">Task Tracker</Link>
      </p>
      <nav aria-label="Main" className="app-nav">
        <Link href="/tasks" className="action-link">
          Tasks
        </Link>
        <Link href="/about" className="action-link">
          About
        </Link>
      </nav>
      {user !== null && (
        <div className="account">
          <span className="account-email">{user.email}</span>
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        </div>
      )}
    </header>
  );
}

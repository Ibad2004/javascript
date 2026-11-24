import Link from "next/link";

export function Header() {
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
        <Link href="/login" className="action-link">
          Log in
        </Link>
        <Link href="/signup" className="action-link">
          Sign up
        </Link>
      </nav>
    </header>
  );
}

import Link from "next/link";

export function Header() {
  return (
    <header className="app-header">
      <p className="app-name">
        <Link href="/">Task Tracker</Link>
      </p>
      <nav aria-label="Main" className="app-nav">
        <Link href="/" className="action-link">
          Tasks
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

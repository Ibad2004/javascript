export function Header() {
  return (
    <header className="app-header">
      {/* Not a heading: each page has its own <h1>, which gets focus after navigation. */}
      <p className="app-name">Task Tracker</p>
      <p className="note">Saved on the local mock server (json-server)</p>
    </header>
  );
}

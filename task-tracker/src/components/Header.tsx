import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

/** `dataLocation` is the note "Saved in this browser" etc.; the login pages have none. */
export function Header({ dataLocation }: { dataLocation?: string }) {
  const { enabled, email, token, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    // Go first: the guard would otherwise send us to /login?from=<this page>.
    void navigate('/login');
    logout();
  }

  return (
    <header className="app-header">
      {/* Not a heading: each page has its own <h1>, which gets focus after navigation. */}
      <p className="app-name">Task Tracker</p>
      {dataLocation !== undefined && <p className="note">{dataLocation}</p>}
      {enabled && token !== null && (
        <p className="account">
          <span className="note">{email}</span>{' '}
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </p>
      )}
    </header>
  );
}

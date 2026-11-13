import { useLocation, useNavigate } from 'react-router';

/**
 * Test-only: shows the current URL (read with currentUrl()) and a hidden "browser Back"
 * button (historyBack()), so tests can check what the filters write to the history.
 */
export function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div hidden>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <button type="button" data-testid="history-back" onClick={() => void navigate(-1)} />
    </div>
  );
}

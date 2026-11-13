import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { focusIds } from '../utils/focusIds';

/**
 * After every in-app navigation, focus moves to the new page's <h1>, so a screen reader
 * reads where the user is (a SPA does not reload the page, so nothing else would).
 * Not on the first load: the browser starts at the top of the page by itself.
 */
export function useFocusHeadingOnNavigation() {
  const location = useLocation();
  // The ref (not "first run") also keeps StrictMode's second effect run from focusing.
  const lastKey = useRef(location.key);

  useEffect(() => {
    if (lastKey.current === location.key) return;
    lastKey.current = location.key;
    const heading = document.getElementById(focusIds.pageHeading);
    if (heading === null) return;
    // Something on the new page already took focus on purpose (the edit form's title).
    const active = document.activeElement;
    const main = heading.closest('main');
    if (active !== null && active !== document.body && main?.contains(active)) return;
    heading.focus();
  }, [location.key]);
}

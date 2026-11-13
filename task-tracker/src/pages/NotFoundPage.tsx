import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { focusIds } from '../utils/focusIds';
import { pageTitle } from '../utils/pageTitle';

/** Any path the app does not know. */
export function NotFoundPage() {
  useDocumentTitle(pageTitle('Page not found'));
  return (
    <main>
      <section className="panel" aria-labelledby={focusIds.pageHeading}>
        <h1 id={focusIds.pageHeading} tabIndex={-1}>
          Page not found
        </h1>
        <p>There is nothing at this address.</p>
        <p>
          <Link to="/">Go to your tasks</Link>
        </p>
      </section>
    </main>
  );
}

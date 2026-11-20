import { useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { focusIds } from '../utils/focusIds';
import { pageTitle } from '../utils/pageTitle';
import { safeFrom } from '../utils/redirect';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const PASSWORD_RULE = `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;

type Field = 'email' | 'password';
type Errors = Partial<Record<Field, string>>;

/** Login (mode "login") and signup (mode "signup"): the same form, two buttons and rules. */
export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Sign up' : 'Log in';
  const { token, message, login, signup } = useAuth();
  const [searchParams] = useSearchParams();
  const rawFrom = searchParams.get('from');
  const from = safeFrom(rawFrom);
  // The link to the other page keeps "from", so the way back survives.
  const otherSearch = rawFrom === null ? '' : `?from=${encodeURIComponent(rawFrom)}`;
  useDocumentTitle(pageTitle(title));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Blocks a double click before React has re-rendered the disabled button.
  const sendingRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Where the cursor was when the toggle was pressed (restored after the type switch).
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const input = passwordRef.current;
    const saved = selectionRef.current;
    selectionRef.current = null;
    if (input !== null && saved !== null && document.activeElement === input) {
      input.setSelectionRange(saved.start, saved.end);
    }
  }, [showPassword]);

  // Already logged in (or just logged in): go to "from", never stay on this page.
  if (token !== null) return <Navigate to={from} replace />;

  function focusFirst(next: Errors) {
    if (next.email !== undefined) emailRef.current?.focus();
    else if (next.password !== undefined) passwordRef.current?.focus();
  }

  function validate(): Errors {
    const next: Errors = {};
    if (email.trim() === '') next.email = 'Enter your email';
    else if (isSignup && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    const length = Array.from(password).length;
    if (password === '') next.password = 'Enter your password';
    else if (isSignup && (length < PASSWORD_MIN || length > PASSWORD_MAX)) {
      next.password = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters`;
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    setShowPassword(false);
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirst(found);
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    try {
      // On success the session starts; the redirect above takes over on the next render.
      await (isSignup ? signup : login)(email.trim(), password);
    } catch (error) {
      const next: Errors = {};
      let general: string | null = null;
      if (error instanceof ApiError && error.kind === 'conflict') {
        next.email = error.fields.email ?? error.message;
      } else if (error instanceof ApiError && error.kind === 'invalid') {
        if (error.fields.email !== undefined) next.email = error.fields.email;
        if (error.fields.password !== undefined) next.password = error.fields.password;
        if (Object.keys(next).length === 0) general = error.message;
      } else if (error instanceof ApiError) {
        general = error.message;
      } else {
        general = 'Something went wrong. Try again.';
      }
      setErrors(next);
      setFormError(general);
      if (Object.keys(next).length > 0) focusFirst(next);
      else emailRef.current?.focus();
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  // One sentence for the screen reader: every message that is on the page.
  const spoken = [formError, errors.email, errors.password]
    .filter((text): text is string => text !== null && text !== undefined)
    .join('. ');
  const passwordDescribedBy = [
    isSignup ? 'auth-password-rule' : '',
    errors.password === undefined ? '' : 'auth-password-error',
  ]
    .filter((id) => id !== '')
    .join(' ');

  return (
    <main className="auth-page">
      <section className="panel" aria-labelledby={focusIds.pageHeading}>
        <h1 id={focusIds.pageHeading} tabIndex={-1}>
          {title}
        </h1>
        {message !== null && <p className="notice-info">{message}</p>}
        <form className="task-form" noValidate aria-busy={isSending} onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            ref={emailRef}
            id="auth-email"
            name="email"
            type="email"
            autoComplete={isSignup ? 'email' : 'username'}
            aria-required="true"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email === undefined ? undefined : 'auth-email-error'}
          />
          {errors.email !== undefined && (
            <p id="auth-email-error" className="field-error">
              {errors.email}
            </p>
          )}

          <label htmlFor="auth-password">Password</label>
          <div className="password-row">
            <input
              ref={passwordRef}
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              aria-required="true"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password !== undefined}
              aria-describedby={passwordDescribedBy === '' ? undefined : passwordDescribedBy}
            />
            <button
              type="button"
              aria-pressed={showPassword}
              // Keep focus (and the cursor) in the password field when the mouse is used.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const input = passwordRef.current;
                selectionRef.current =
                  input === null
                    ? null
                    : { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 };
                setShowPassword((shown) => !shown);
              }}
            >
              <EyeIcon slashed={showPassword} />
              <span>{showPassword ? 'Hide password' : 'Show password'}</span>
            </button>
          </div>
          {isSignup && (
            <span id="auth-password-rule" className="counter">
              {PASSWORD_RULE}
            </span>
          )}
          {errors.password !== undefined && (
            <p id="auth-password-error" className="field-error">
              {errors.password}
            </p>
          )}

          {formError !== null && <p className="form-error">{formError}</p>}
          <div className="form-buttons">
            <button type="submit" className="button-primary" disabled={isSending}>
              {isSending ? 'Sending…' : title}
            </button>
          </div>
        </form>
        {/* Always on the page, only its text changes: screen readers read the new text. */}
        <p role="status" className="visually-hidden">
          {spoken}
        </p>
        <p>
          {isSignup ? 'Already have an account? ' : 'No account yet? '}
          <Link to={`${isSignup ? '/login' : '/signup'}${otherSearch}`}>
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </section>
    </main>
  );
}

/** An inline SVG (no emoji or icon font): an eye, with a slash while the password is shown. */
function EyeIcon({ slashed }: { slashed: boolean }) {
  return (
    <svg
      data-testid={slashed ? 'icon-eye-slash' : 'icon-eye'}
      className="eye-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {slashed && <path d="M3 3l18 18" />}
    </svg>
  );
}

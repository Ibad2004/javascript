// What the signup and login actions answer with. No server-only code here: the form uses it too.

export type AuthFieldErrors = { email?: string; password?: string };

export type AuthState = {
  message?: string;
  fieldErrors?: AuthFieldErrors;
  /** Sent back so the email field is not emptied after a failed attempt. */
  email?: string;
};

export const AUTH_MESSAGES = {
  invalidEmail: "Enter a valid email address",
  passwordRequired: "Enter your password",
  passwordTooShort: "Password must be at least 8 characters",
  passwordTooLong: "Password must be at most 72 bytes (non-English characters take more than one)",
  passwordBlank: "Password cannot be only spaces",
  emailTaken: "An account with this email already exists",
  wrongCredentials: "Email or password is incorrect",
  tooManyAttempts: "Too many attempts, try again later",
  tooManySignups: "Too many sign-ups from your network. Please try again in an hour.",
  failed: "Something went wrong. Please try again.",
} as const;

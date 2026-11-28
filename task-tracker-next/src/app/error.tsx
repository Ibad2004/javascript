"use client";
// Client: Next.js requires error boundaries to be client components. This one covers what
// (main)/error.tsx does not, such as /login. The error itself is never shown.
export { default } from "./(main)/error";

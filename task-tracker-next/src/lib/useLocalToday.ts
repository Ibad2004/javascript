"use client";
// Client: reads the browser's own clock, so "today" is the visitor's local date (not the server's).
import { useSyncExternalStore } from "react";
import { toLocalDateString } from "@/lib/dates";

const subscribe = () => () => undefined;

/** null while rendering on the server and during hydration, then the user's local "YYYY-MM-DD". */
export function useLocalToday(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => toLocalDateString(new Date()),
    () => null,
  );
}

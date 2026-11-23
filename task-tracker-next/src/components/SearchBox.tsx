"use client";
// Client: a typed input with a debounce that updates the URL (useState, timers and the router).
import { useEffect, useId, useState } from "react";
import { SEARCH_MAX, cutSearch } from "@/lib/filters";
import { useFilterUrl } from "@/components/useFilterUrl";

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchBox() {
  const { filters, update } = useFilterUrl();
  const urlQ = filters.q;
  const id = useId();
  const [value, setValue] = useState(urlQ);
  // The last text we put in the URL, so a URL change made by us never overwrites what is typed.
  const [sent, setSent] = useState(urlQ);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);

  // The URL changed from outside (e.g. "Clear filters"): show it in the input.
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    if (urlQ !== sent) {
      setSent(urlQ);
      setValue(urlQ);
    }
  }

  useEffect(() => {
    if (value === sent) return;
    const timer = setTimeout(() => {
      setSent(value);
      update({ q: cutSearch(value) });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, sent, update]);

  return (
    <label className="filter-field" htmlFor={id}>
      <span>Search by title</span>
      <input
        id={id}
        type="search"
        value={value}
        maxLength={SEARCH_MAX}
        dir="auto"
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
      />
    </label>
  );
}

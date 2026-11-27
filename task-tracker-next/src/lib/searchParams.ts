import { readFilters, type Filters } from "@/lib/filters";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * The page's searchParams are untrusted (typed, shared, edited by hand). A repeated param
 * uses the first value; unknown values fall back to the defaults; q is cut to 100 characters.
 */
export function parseSearchParams(raw: RawSearchParams): Filters {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return readFilters(params);
}

/** The raw `?next=` value (first one wins). It is NOT safe yet: pass it to safeNextPath. */
export function parseNextParam(raw: RawSearchParams): string | undefined {
  const value = raw.next;
  return Array.isArray(value) ? value[0] : value;
}

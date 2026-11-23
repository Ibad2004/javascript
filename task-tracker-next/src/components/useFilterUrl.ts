"use client";
// Client: needs the router and the browser URL to change the filters without a full page reload.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { readFilters, writeFilters, type Filters } from "@/lib/filters";

/** The current filters (read from the URL) and a function that changes some of them. */
export function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(new URLSearchParams(searchParams.toString()));
  const key = searchParams.toString();

  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...readFilters(new URLSearchParams(key)), ...patch };
      const query = writeFilters(next).toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
    },
    [router, pathname, key],
  );

  return { filters, update };
}

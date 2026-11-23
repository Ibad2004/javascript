"use client";
// Client: buttons and a select that change the URL through the router (event handlers need the browser).
import {
  PRIORITY_FILTERS,
  PRIORITY_FILTER_LABELS,
  STATUS_FILTERS,
  STATUS_LABELS,
  type PriorityFilter,
  type StatusFilter,
} from "@/lib/filters";
import { useFilterUrl } from "@/components/useFilterUrl";

function isPriorityFilter(value: string): value is PriorityFilter {
  return PRIORITY_FILTERS.some((item) => item === value);
}

/** `counts` are plain numbers worked out on the server over ALL tasks. */
export function FilterControls({ counts }: { counts: Record<StatusFilter, number> }) {
  const { filters, update } = useFilterUrl();
  return (
    <>
      <div className="status-filter" role="group" aria-label="Status">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className="toggle-button"
            aria-pressed={filters.status === status}
            onClick={() => update({ status })}
          >
            {STATUS_LABELS[status]} ({counts[status]})
          </button>
        ))}
      </div>
      <label className="filter-field">
        <span>Filter by priority</span>
        <select
          value={filters.priority}
          onChange={(event) => {
            if (isPriorityFilter(event.target.value)) update({ priority: event.target.value });
          }}
        >
          {PRIORITY_FILTERS.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_FILTER_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

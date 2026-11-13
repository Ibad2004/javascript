import {
  PRIORITY_FILTERS,
  PRIORITY_FILTER_LABELS,
  SEARCH_MAX,
  STATUS_FILTERS,
  STATUS_LABELS,
  type Filters,
  type PriorityFilter,
  type StatusFilter,
} from '../utils/filters';
import { focusIds } from '../utils/focusIds';

type TaskFiltersProps = {
  filters: Filters;
  counts: Record<StatusFilter, number>;
  onStatusChange: (status: StatusFilter) => void;
  onPriorityChange: (priority: PriorityFilter) => void;
  onSearchChange: (q: string) => void;
};

function isPriorityFilter(value: string): value is PriorityFilter {
  return PRIORITY_FILTERS.some((item) => item === value);
}

/** Status buttons with counts, a priority select and a title search. Every control is labelled. */
export function TaskFilters({
  filters,
  counts,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
}: TaskFiltersProps) {
  return (
    <div className="filters">
      <div className="status-filter" role="group" aria-label="Status">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className="toggle-button"
            aria-pressed={filters.status === status}
            onClick={() => onStatusChange(status)}
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
            if (isPriorityFilter(event.target.value)) onPriorityChange(event.target.value);
          }}
        >
          {PRIORITY_FILTERS.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_FILTER_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Search by title</span>
        <input
          type="search"
          id={focusIds.search}
          value={filters.q}
          maxLength={SEARCH_MAX}
          dir="auto"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { Stats } from '../api/source';

type StatsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: Stats };

type StatsBarProps = {
  getStats: (timeZone: string, signal?: AbortSignal) => Promise<Stats>;
  /** Changes after every saved change: the numbers are loaded again. */
  dataVersion: number;
};

/** "3 done · 2 pending · 1 overdue · 4 this week" from GET /stats, in the browser's time zone. */
export function StatsBar({ getStats, dataVersion }: StatsBarProps) {
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getStats(timeZone, controller.signal).then(
      (stats) => {
        if (!controller.signal.aborted) setState({ status: 'ready', stats });
      },
      () => {
        // The list still works without the numbers.
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [getStats, dataVersion]);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <p className="stats-bar">Stats unavailable</p>;
  const { done, pending, overdue, thisWeek } = state.stats;
  return (
    <p className="stats-bar">
      {done} done · {pending} pending · {overdue} overdue · {thisWeek} this week
    </p>
  );
}

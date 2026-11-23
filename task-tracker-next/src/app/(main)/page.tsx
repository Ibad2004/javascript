import type { Metadata } from "next";
import Link from "next/link";
import { AddTaskForm } from "@/components/AddTaskForm";
import { FilterControls } from "@/components/FilterControls";
import { SearchBox } from "@/components/SearchBox";
import { TaskList } from "@/components/TaskList";
import { TaskSummary } from "@/components/TaskSummary";
import { countByStatus, filterTasks } from "@/lib/filters";
import { getListStatusText } from "@/lib/tasks";
import { getSampleTasks } from "@/lib/sampleTasks";
import { parseSearchParams, type RawSearchParams } from "@/lib/searchParams";

export const metadata: Metadata = { title: "Your tasks" };

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseSearchParams(await searchParams);
  const all = getSampleTasks();
  const visible = filterTasks(all, filters);

  return (
    <main id="main" className="list-page">
      <section className="panel" aria-labelledby="list-heading">
        <h1 id="list-heading">Your tasks</h1>
        <TaskSummary tasks={all} />
        <div className="filters">
          <FilterControls counts={countByStatus(all)} />
          <SearchBox />
        </div>
        <p role="status" className="list-status">
          {getListStatusText(all.length, visible.length)}
        </p>
        <TaskList tasks={visible} totalCount={all.length} />
        <p className="note">
          <Link href="/login">Log in</Link> to keep your own tasks (coming on Day 24).
        </p>
      </section>
      <section className="panel" aria-labelledby="form-heading">
        <h2 id="form-heading">Add a task</h2>
        <AddTaskForm />
      </section>
    </main>
  );
}

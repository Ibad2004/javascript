import type { Metadata } from "next";
import Link from "next/link";
import { AddTaskForm } from "@/components/AddTaskForm";
import { FilterControls } from "@/components/FilterControls";
import { SearchBox } from "@/components/SearchBox";
import { TaskList } from "@/components/TaskList";
import { TaskSummary } from "@/components/TaskSummary";
import { getListStatusText } from "@/lib/tasks";
import { getTaskCounts, getTasks } from "@/lib/taskData";
import { parseSearchParams, type RawSearchParams } from "@/lib/searchParams";

// Rendered on every request: tasks are never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your tasks" };

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseSearchParams(await searchParams);
  const [visible, counts] = await Promise.all([getTasks(filters), getTaskCounts()]);

  return (
    <main id="main" className="list-page">
      <section className="panel" aria-labelledby="list-heading">
        <h1 id="list-heading">Your tasks</h1>
        <TaskSummary total={counts.all} done={counts.done} />
        <div className="filters">
          <FilterControls counts={counts} />
          <SearchBox />
        </div>
        <p role="status" className="list-status">
          {getListStatusText(counts.all, visible.length)}
        </p>
        <TaskList tasks={visible} totalCount={counts.all} />
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

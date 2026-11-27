import type { Metadata } from "next";
import { AddTaskForm } from "@/components/AddTaskForm";
import { FilterControls } from "@/components/FilterControls";
import { SearchBox } from "@/components/SearchBox";
import { TaskList } from "@/components/TaskList";
import { TaskSummary } from "@/components/TaskSummary";
import { writeFilters } from "@/lib/filters";
import { getListStatusText } from "@/lib/tasks";
import { getTaskCounts, getTasks } from "@/lib/taskData";
import { parseSearchParams, type RawSearchParams } from "@/lib/searchParams";
import { requirePageUser } from "@/lib/session";

// Rendered on every request: tasks are never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your tasks" };

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseSearchParams(await searchParams);
  const query = writeFilters(filters).toString();
  const user = await requirePageUser(query === "" ? "/tasks" : `/tasks?${query}`);
  const [visible, counts] = await Promise.all([getTasks(user.id, filters), getTaskCounts(user.id)]);

  return (
    <main id="main" className="list-page">
      <section className="panel" aria-labelledby="list-heading">
        <h1 id="list-heading" tabIndex={-1}>
          Your tasks
        </h1>
        <TaskSummary total={counts.all} done={counts.done} />
        <div className="filters">
          <FilterControls counts={counts} />
          <SearchBox />
        </div>
        <p role="status" className="list-status">
          {getListStatusText(counts.all, visible.length)}
        </p>
        <TaskList tasks={visible} totalCount={counts.all} />
      </section>
      <section className="panel" aria-labelledby="form-heading">
        <h2 id="form-heading">Add a task</h2>
        <AddTaskForm />
      </section>
    </main>
  );
}

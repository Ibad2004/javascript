import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/TaskDetail";
import { TaskEditor } from "@/components/TaskEditor";
import { requirePageUser } from "@/lib/session";
import { getTaskById } from "@/lib/taskData";

// Rendered on every request: tasks are never cached.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** Logged out: to /login. Someone else's task: null, exactly like a task that does not exist. */
async function loadOwnTask(params: Props["params"]) {
  const { id } = await params;
  const user = await requirePageUser(`/tasks/${encodeURIComponent(id)}`);
  return getTaskById(user.id, id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const task = await loadOwnTask(params);
  if (task === null) return { title: "Task not found" };
  const chars = Array.from(task.title);
  return { title: chars.length > 50 ? `${chars.slice(0, 50).join("")}…` : task.title };
}

export default async function TaskPage({ params }: Props) {
  const task = await loadOwnTask(params);
  if (task === null) notFound();
  return (
    <main id="main">
      <p>
        <Link href="/tasks">← Back to tasks</Link>
      </p>
      <section className="panel" aria-labelledby="task-heading">
        <h1 id="task-heading" dir="auto">
          {task.title}
        </h1>
        <TaskEditor key={task.id} task={task}>
          <TaskDetail task={task} />
        </TaskEditor>
      </section>
    </main>
  );
}

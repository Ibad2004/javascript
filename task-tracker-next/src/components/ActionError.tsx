"use client";
// Client: the Refresh button needs the router.
import { useRouter } from "next/navigation";
import { ACTION_MESSAGES } from "@/lib/actionResult";

/** The message after a failed toggle or delete. A task that is gone can be cleared with Refresh. */
export function ActionError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="action-error">
      <p role="alert" className="form-error">
        {message}
      </p>
      {message === ACTION_MESSAGES.gone && (
        <button type="button" onClick={() => router.refresh()}>
          Refresh
        </button>
      )}
    </div>
  );
}

import { unstable_rethrow } from "next/navigation";
import { saveFailed, type ActionResult } from "@/lib/actionResult";

/**
 * Calls a server action from the browser. If the request itself fails (offline, server down),
 * this gives the same friendly result instead of the error page, so typed text is not lost.
 */
export async function callAction(action: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await action();
  } catch (error) {
    unstable_rethrow(error); // redirect() arrives here as an error that Next.js must receive
    return saveFailed();
  }
}

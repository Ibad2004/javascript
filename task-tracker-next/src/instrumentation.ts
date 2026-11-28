import { checkEnv } from "@/lib/env";

/** Next.js runs this once when a server instance starts (not during the build). */
export function register(): void {
  checkEnv();
}

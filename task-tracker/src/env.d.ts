/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where json-server runs. Optional: the app falls back to http://localhost:3001. */
  readonly VITE_API_URL?: string;
  /** "server" (task-api, npm run dev), "api" (json-server) or "local" (the browser's localStorage). */
  readonly VITE_DATA_SOURCE?: string;
}

// The environment variables the app cannot run without. Messages name the variable and
// never contain its value. No "server-only" here: src/instrumentation.ts imports it too.

export const SECRET_MIN = 32;

export function readMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (uri === undefined || uri.trim() === "") {
    throw new Error("MONGODB_URI is not set — see .env.example");
  }
  return uri;
}

export function readAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret === undefined || secret.length < SECRET_MIN) {
    throw new Error(`AUTH_SECRET is missing or shorter than ${SECRET_MIN} characters — see .env.example`);
  }
  return secret;
}

/** Checked once when a server instance starts. */
export function checkEnv(): void {
  readMongoUri();
  readAuthSecret();
}

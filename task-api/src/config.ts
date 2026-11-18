export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type JwtConfig = { secret: string; expiresIn: string };

/** Reads the JWT settings. Never put the secret itself in a message. */
export function loadJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const secret = env["JWT_SECRET"];
  if (!secret) throw new ConfigError("JWT_SECRET is missing. Add it to .env (at least 32 characters).");
  if (secret.length < 32) throw new ConfigError("JWT_SECRET is too short. Use at least 32 characters.");
  return { secret, expiresIn: env["JWT_EXPIRES_IN"] || "1h" };
}

export const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !isUnknownArray(value);

export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
